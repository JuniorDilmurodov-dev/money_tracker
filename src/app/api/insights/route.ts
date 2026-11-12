import OpenAI from "openai";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getExpensesInRange,
  getInsightsUsedToday,
  getLatestInsight,
  hasExpensesSince,
  inCurrency,
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
  type Range,
} from "@/lib/dates";
import { formatAmount } from "@/lib/money";
import { formatAmountFor } from "@/lib/currency";
import { getT } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { CURRENCIES, type Currency, type Expense, type InsightPeriod } from "@/lib/types";

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
- Amounts are in so'm and/or USD, always tracked separately. Never convert between them, add them together or compare them; call dollars "USD".
- Lead with what actually changed versus the previous period, and name the categories.
- Point out recurring small purchases only when the data shows the same kind of purchase repeating and the total is worth mentioning.
- End with one or two concrete places to cut back, tied to a specific category and a rough amount.
- Write plainly to the person, second person. Do not moralise, do not congratulate, do not repeat the numbers twice, do not add a closing pep talk.
- If there is little or no data, say so in one sentence instead of inventing a pattern.`;
}

/** Weekly and monthly periods share the same "nothing logged" copy. */
type Granularity = "week" | "month";

function granularityOf(period: InsightPeriod): Granularity {
  return period === "this_week" || period === "last_week" ? "week" : "month";
}

/**
 * Old clients (and old localStorage caches) still send "week"/"month" —
 * those map onto the "this_*" variant so a saved bookmark or a stale tab
 * keeps working instead of erroring out.
 */
function normalizePeriod(value: unknown): InsightPeriod {
  if (value === "week") return "this_week";
  if (value === "month") return "this_month";
  if (
    value === "this_week" ||
    value === "last_week" ||
    value === "this_month" ||
    value === "last_month"
  ) {
    return value;
  }
  return "this_week";
}

function rangeForPeriod(period: InsightPeriod, now: string): Range {
  switch (period) {
    case "this_week":
      return weekRange(now);
    case "last_week":
      return weekRange(addDays(now, -7));
    case "this_month":
      return monthRange(now);
    case "last_month":
      return monthRange(addMonths(now, -1));
  }
}

const EMPTY_TEXT: Record<Granularity, Record<Locale, string>> = {
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
    // USD keeps its cents in the key so $1.20 and $1.40 are not the same purchase.
    const amountKey = e.currency === "USD" ? e.amount.toFixed(2) : Math.round(e.amount);
    const key = `${e.currency}|${e.category}|${(e.note ?? "").toLowerCase().trim()}|${amountKey}`;
    const price = e.currency === "USD" ? `${formatAmountFor(e.amount, "USD")} USD` : `${formatAmount(e.amount)} so'm`;
    const label = e.note?.trim()
      ? `${e.category} — "${e.note.trim()}" at ${price}`
      : `${e.category} at ${price}`;
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

/** "1 200 USD" / "150 000 so'm" — the unit travels with every number in the prompt. */
function promptMoney(value: number, currency: Currency): string {
  return currency === "USD" ? `${formatAmountFor(value, "USD")} USD` : `${formatAmount(value)} so'm`;
}

/** One currency's block: totals and the category breakdown against the previous period. */
function currencySection(
  currency: Currency,
  previousLabel: string,
  current: Expense[],
  previous: Expense[],
): string[] {
  const money = (value: number) => promptMoney(value, currency);
  const currentByCategory = totalsByCategory(current);
  const previousByCategory = new Map(
    totalsByCategory(previous).map((t) => [t.category, t.total]),
  );
  const lines = [
    `Total this period: ${money(sumExpenses(current))} across ${current.length} expenses`,
    `Total ${previousLabel}: ${money(sumExpenses(previous))} across ${previous.length} expenses`,
    "",
    "By category (this period vs previous):",
    ...currentByCategory.map(
      (t) =>
        `- ${t.category}: ${money(t.total)} (${Math.round(t.share)}% of spending), previously ${money(previousByCategory.get(t.category) ?? 0)}`,
    ),
  ];

  const dropped = [...previousByCategory.entries()].filter(
    ([category]) => !currentByCategory.some((t) => t.category === category),
  );
  if (dropped.length > 0) {
    lines.push(
      "",
      "Categories with spending last period but none this period:",
      ...dropped.map(([c, total]) => `- ${c}: ${money(total)} previously`),
    );
  }

  const recurring = recurringPurchases(current);
  if (recurring.length > 0) {
    lines.push(
      "",
      "Repeated purchases this period (3 or more times):",
      ...recurring.map((g) => `- ${g.label}, ${g.count} times, ${money(g.total)} total`),
    );
  }
  return lines;
}

/**
 * Entry point for the prompt. Someone who only ever logged so'm gets exactly
 * the original prompt; once a second currency appears each one gets its own
 * section and the model is told they are separate ledgers.
 */
function buildCurrencyPrompt(
  periodLabel: string,
  previousLabel: string,
  current: Expense[],
  previous: Expense[],
) {
  const withData = CURRENCIES.filter(
    (c) => inCurrency(current, c).length > 0 || inCurrency(previous, c).length > 0,
  );
  if (withData.length <= 1 && withData[0] !== "USD") {
    return buildPrompt(periodLabel, previousLabel, current, previous);
  }

  const lines = [`Period: ${periodLabel}`];
  for (const c of withData) {
    lines.push(
      "",
      c === "USD"
        ? "== Spending in USD (separate from so'm, never add them) =="
        : "== Spending in so'm (separate from USD, never add them) ==",
      ...currencySection(c, previousLabel, inCurrency(current, c), inCurrency(previous, c)),
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

  // Every response past this point is for a known account, so it can always
  // report where its quota stands — including the error paths.
  const withQuota = async (body: Record<string, unknown>, status?: number) => {
    const used = await getInsightsUsedToday().catch(() => 0);
    return Response.json(
      { ...body, remaining: Math.max(DAILY_LIMIT - used, 0), limit: DAILY_LIMIT },
      status ? { status } : undefined,
    );
  };

  // A limit of zero is the kill switch, so it answers before any other work.
  if (DAILY_LIMIT === 0) {
    return withQuota({ error: t.actions.insightsDisabled }, 503);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("insights: OPENAI_API_KEY is not set");
    return withQuota({ error: t.actions.insightsFailed, quotaSpent: false }, 500);
  }

  let period: InsightPeriod = "this_week";
  // The panel defaults this to the site language, but sends it explicitly so
  // the reader can generate in a language they aren't browsing in.
  let lang: Locale = locale;
  try {
    const body = await request.json();
    period = normalizePeriod(body?.period);
    if (isLocale(body?.lang)) lang = body.lang;
  } catch {
    // Default to this week, in the reader's language.
  }

  const granularity = granularityOf(period);
  const now = today();
  const currentRange = rangeForPeriod(period, now);
  const previousRange =
    granularity === "week"
      ? weekRange(addDays(currentRange.from, -7))
      : monthRange(addMonths(currentRange.from, -1));

  const [current, previous] = await Promise.all([
    getExpensesInRange(currentRange),
    getExpensesInRange(previousRange),
  ]);

  if (current.length === 0) {
    // No periodStart: this is deliberately not saved to history, on server
    // or in the client cache — there's nothing worth keeping.
    return withQuota({
      text: EMPTY_TEXT[granularity][lang],
      lang,
      generatedAt: new Date().toISOString(),
    });
  }

  // A repeat request for the same period/language, with nothing logged since
  // the last generation, doesn't need another model call — the saved text is
  // still accurate. Checked before the quota count below so a cache hit never
  // spends a day's allowance.
  try {
    const latest = await getLatestInsight({ period, periodStart: currentRange.from, lang });
    if (latest) {
      const cachedText = latest.text_en ?? latest.text_ru ?? latest.text_uz;
      if (cachedText && !(await hasExpensesSince(currentRange, latest.created_at))) {
        return withQuota({
          text: cachedText,
          lang,
          generatedAt: latest.created_at,
          period,
          periodStart: currentRange.from,
          cached: true,
        });
      }
    }
  } catch {
    // No cache to check — fall through and generate normally.
  }

  const periodLabel =
    granularity === "week"
      ? `week of ${formatDayMonth(currentRange.from, "en")} to ${formatDayMonth(currentRange.to, "en")}`
      : formatMonthYear(currentRange.from, "en");
  const previousLabel = granularity === "week" ? "the previous week" : "the previous month";

  // Checked here rather than up with the auth guard so the free paths above —
  // a signed-in reader with no expenses yet, or a cache hit — never burn a
  // day's quota. A pair of simultaneous requests can both read the same count
  // and slip through; one extra call on a limit of three is not worth a lock
  // over.
  try {
    if ((await getInsightsUsedToday()) >= DAILY_LIMIT) {
      return withQuota({ error: t.actions.dailyLimitReached(DAILY_LIMIT) }, 429);
    }
  } catch (error) {
    // An uncountable quota is an unenforceable one, so this fails closed: the
    // usual cause is the `insights` migration never having been applied.
    console.error("insights: could not count today's usage", error);
    return withQuota({ error: t.actions.insightsFailed, quotaSpent: false }, 500);
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
          content: buildCurrencyPrompt(periodLabel, previousLabel, current, previous),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      console.error("insights: model returned no text");
      return withQuota({ error: t.actions.insightsFailed, quotaSpent: true }, 502);
    }

    let parsed: { text?: string };
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("insights: model returned malformed JSON", error, raw);
      return withQuota({ error: t.actions.insightsFailed, quotaSpent: true }, 502);
    }

    const text = parsed.text?.trim();
    if (!text) {
      console.error("insights: model JSON had no text field", raw);
      return withQuota({ error: t.actions.insightsFailed, quotaSpent: true }, 502);
    }

    // Not best-effort: an insight that isn't saved is a generation the daily
    // quota never counts, since the quota is just a count of saved rows. If
    // this fails, the model was already paid for but the text goes nowhere —
    // returning it anyway would let a broken save turn into unlimited free
    // generations.
    let saved;
    try {
      saved = await saveInsight({
        period,
        periodStart: currentRange.from,
        lang,
        text,
      });
    } catch (error) {
      console.error("insights: could not save generated insight", error);
      return withQuota({ error: t.actions.insightsFailed, quotaSpent: true }, 500);
    }

    return withQuota({
      text,
      lang,
      generatedAt: saved.created_at,
      period,
      periodStart: currentRange.from,
    });
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      return withQuota({ error: t.actions.rateLimited, quotaSpent: false }, 429);
    }
    console.error("insights: OpenAI request failed", error);
    return withQuota({ error: t.actions.insightsFailed, quotaSpent: false }, 500);
  }
}
