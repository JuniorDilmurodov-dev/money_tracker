import OpenAI from "openai";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  countInsightsToday,
  getExpensesInRange,
  saveInsight,
  sumExpenses,
  totalsByCategory,
} from "@/lib/queries";
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatMonthYear,
  monthRange,
  today,
  weekRange,
} from "@/lib/dates";
import { formatAmount } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import type { Expense } from "@/lib/types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * Generations allowed per account per day. This is the only thing standing
 * between a public signup form and an OpenAI bill: the panel's button can be
 * pressed as often as someone likes, and every press that reaches the model
 * costs the operator money, not the user.
 */
const DAILY_LIMIT = (() => {
  const configured = Number(process.env.INSIGHTS_DAILY_LIMIT ?? 3);
  return Number.isFinite(configured) && configured >= 0 ? configured : 3;
})();

/**
 * One language per call. The model used to write all three at once, which
 * tripled the output tokens for two versions the reader would likely never
 * open — the panel now asks which language it wants before spending anything.
 */
const LANGUAGE_RULES: Record<Locale, string> = {
  en: 'Write in English. Call the currency "so\'m".',
  ru: 'Write in Russian. Call the currency "сум". Use natural everyday Russian.',
  uz: 'Write in Uzbek, Latin script. Call the currency "so\'m". Use natural everyday Uzbek — write it as an Uzbek speaker would, not as a translation of an English sentence.',
};

function systemPrompt(lang: Locale): string {
  return `You analyse a single person's personal spending and write a short, practical summary.

${LANGUAGE_RULES[lang]}

Output strict JSON with exactly one key, "text", holding the summary as a string. No markdown fences, no other keys, no commentary outside the JSON.

Rules:
- 3 to 5 sentences. No more.
- Plain text only. No markdown, no bullet points, no headings, no asterisks, no emoji.
- Amounts are Uzbek so'm. Write them with spaces as thousand separators, e.g. 150 000.
- Lead with what actually changed versus the previous period, and name the categories.
- Point out recurring small purchases only when the data shows the same kind of purchase repeating and the total is worth mentioning.
- End with one or two concrete places to cut back, tied to a specific category and a rough amount.
- Write plainly to the person, second person. Do not moralise, do not congratulate, do not repeat the numbers twice, do not add a closing pep talk.
- If there is little or no data, say so in one sentence instead of inventing a pattern.`;
}

const EMPTY_TEXT: Record<"week" | "month", Record<Locale, string>> = {
  week: {
    en: "Nothing logged this week yet, so there is no pattern to read. Log a few expenses and check back.",
    ru: "На этой неделе пока ничего не записано, поэтому разбирать нечего. Запишите несколько трат и загляните снова.",
    uz: "Bu hafta hali hech narsa qayd etilmagan, shuning uchun tahlil qiladigan narsa yo'q. Bir nechta xarajat kiritib, keyin qayta tekshiring.",
  },
  month: {
    en: "Nothing logged this month yet, so there is no pattern to read. Log a few expenses and check back.",
    ru: "В этом месяце пока ничего не записано, поэтому разбирать нечего. Запишите несколько трат и загляните снова.",
    uz: "Bu oy hali hech narsa qayd etilmagan, shuning uchun tahlil qiladigan narsa yo'q. Bir nechta xarajat kiritib, keyin qayta tekshiring.",
  },
};

/** Repeated (category + note + amount) combinations — the "small stuff adds up" signal. */
function recurringPurchases(expenses: Expense[]) {
  const groups = new Map<string, { label: string; count: number; total: number }>();

  for (const e of expenses) {
    const key = `${e.category}|${(e.note ?? "").toLowerCase().trim()}|${Math.round(e.amount)}`;
    const label = e.note?.trim()
      ? `${e.category} — "${e.note.trim()}" at ${formatAmount(e.amount)} so'm`
      : `${e.category} at ${formatAmount(e.amount)} so'm`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += e.amount;
    } else {
      groups.set(key, { label, count: 1, total: e.amount });
    }
  }

  return [...groups.values()]
    .filter((g) => g.count >= 3)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function buildPrompt(
  periodLabel: string,
  previousLabel: string,
  current: Expense[],
  previous: Expense[],
) {
  const currentTotal = sumExpenses(current);
  const previousTotal = sumExpenses(previous);
  const currentByCategory = totalsByCategory(current);
  const previousByCategory = new Map(
    totalsByCategory(previous).map((t) => [t.category, t.total]),
  );

  const lines = [
    `Period: ${periodLabel}`,
    `Total this period: ${formatAmount(currentTotal)} so'm across ${current.length} expenses`,
    `Total ${previousLabel}: ${formatAmount(previousTotal)} so'm across ${previous.length} expenses`,
    "",
    "By category (this period vs previous):",
    ...currentByCategory.map((t) => {
      const prev = previousByCategory.get(t.category) ?? 0;
      return `- ${t.category}: ${formatAmount(t.total)} so'm (${Math.round(t.share)}% of spending), previously ${formatAmount(prev)} so'm`;
    }),
  ];

  // Categories that were active before and stopped are as interesting as new ones.
  const dropped = [...previousByCategory.entries()].filter(
    ([category]) => !currentByCategory.some((t) => t.category === category),
  );
  if (dropped.length > 0) {
    lines.push(
      "",
      "Categories with spending last period but none this period:",
      ...dropped.map(([c, total]) => `- ${c}: ${formatAmount(total)} so'm previously`),
    );
  }

  const recurring = recurringPurchases(current);
  if (recurring.length > 0) {
    lines.push(
      "",
      "Repeated purchases this period (3 or more times):",
      ...recurring.map(
        (g) => `- ${g.label}, ${g.count} times, ${formatAmount(g.total)} so'm total`,
      ),
    );
  }

  lines.push("", 'Write the summary as JSON: {"text": "..."}.');
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  // Errors come back in the caller's language; the prompt itself stays English
  // because that's the model's input, not something a user reads.
  const { locale, t } = await getT();

  // Auth first — this endpoint spends money on every call.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return Response.json({ error: t.actions.notSignedIn }, { status: 401 });
  }

  // A limit of zero is the kill switch, so it answers before any other work.
  if (DAILY_LIMIT === 0) {
    return Response.json({ error: t.actions.insightsDisabled }, { status: 503 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: t.actions.missingApiKey }, { status: 500 });
  }

  let period: "week" | "month" = "week";
  // The panel defaults this to the site language, but sends it explicitly so
  // the reader can generate in a language they aren't browsing in.
  let lang: Locale = locale;
  try {
    const body = await request.json();
    if (body?.period === "month") period = "month";
    if (isLocale(body?.lang)) lang = body.lang;
  } catch {
    // Default to the week, in the reader's language.
  }

  const now = today();
  const currentRange = period === "week" ? weekRange(now) : monthRange(now);
  const previousRange =
    period === "week"
      ? weekRange(addDays(currentRange.from, -7))
      : monthRange(addMonths(currentRange.from, -1));

  const [current, previous] = await Promise.all([
    getExpensesInRange(currentRange),
    getExpensesInRange(previousRange),
  ]);

  if (current.length === 0) {
    return Response.json({
      text: EMPTY_TEXT[period][lang],
      lang,
      generatedAt: new Date().toISOString(),
    });
  }

  const periodLabel =
    period === "week"
      ? `week of ${formatDayMonth(currentRange.from, "en")} to ${formatDayMonth(currentRange.to, "en")}`
      : formatMonthYear(currentRange.from, "en");
  const previousLabel = period === "week" ? "last week" : "last month";

  // Checked here rather than up with the auth guard so the free paths above —
  // a signed-in reader with no expenses yet — never burn a day's quota. A pair
  // of simultaneous requests can both read the same count and slip through;
  // one extra call on a limit of three is not worth a lock over.
  try {
    if (await countInsightsToday() >= DAILY_LIMIT) {
      return Response.json(
        { error: t.actions.dailyLimitReached(DAILY_LIMIT) },
        { status: 429 },
      );
    }
  } catch {
    // An uncountable quota is an unenforceable one, so this fails closed: the
    // usual cause is the `insights` migration never having been applied.
    return Response.json({ error: t.actions.insightsFailed }, { status: 500 });
  }

  const openai = new OpenAI();

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(lang) },
        {
          role: "user",
          content: buildPrompt(periodLabel, previousLabel, current, previous),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return Response.json({ error: t.actions.modelNoText }, { status: 502 });
    }

    let parsed: { text?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: t.actions.modelBadJson }, { status: 502 });
    }

    const text = parsed.text?.trim();
    if (!text) {
      return Response.json({ error: t.actions.modelNoText }, { status: 502 });
    }

    // Best-effort: a generated summary is still worth returning even if this
    // Supabase project hasn't had the `insights` migration applied yet.
    const generatedAt = await saveInsight({
      period,
      periodStart: currentRange.from,
      lang,
      text,
    })
      .then((saved) => saved.created_at)
      .catch(() => new Date().toISOString());

    return Response.json({
      text,
      lang,
      generatedAt,
      period,
      periodStart: currentRange.from,
    });
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      return Response.json({ error: t.actions.rateLimited }, { status: 429 });
    }
    if (error instanceof OpenAI.AuthenticationError) {
      return Response.json({ error: t.actions.badApiKey }, { status: 500 });
    }
    if (error instanceof OpenAI.NotFoundError) {
      return Response.json(
        { error: t.actions.modelUnavailable(MODEL) },
        { status: 502 },
      );
    }
    if (error instanceof OpenAI.APIError) {
      return Response.json(
        { error: t.actions.openaiError(error.status, error.message) },
        { status: 502 },
      );
    }
    return Response.json({ error: t.actions.insightsFailed }, { status: 500 });
  }
}
