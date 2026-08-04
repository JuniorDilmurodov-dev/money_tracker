import OpenAI from "openai";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
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
import type { Expense } from "@/lib/types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You analyse a single person's personal spending and write a short, practical summary in two languages: English and Uzbek (Latin script, natural everyday Uzbek, not a literal translation).

Output strict JSON with exactly two keys, "en" and "uz", each a string. No markdown fences, no other keys, no commentary outside the JSON.

Rules for each language version:
- 3 to 5 sentences. No more.
- Plain text only. No markdown, no bullet points, no headings, no asterisks, no emoji.
- Amounts are Uzbek so'm. Write them with spaces as thousand separators and the word so'm, e.g. 150 000 so'm.
- Lead with what actually changed versus the previous period, and name the categories.
- Point out recurring small purchases only when the data shows the same kind of purchase repeating and the total is worth mentioning.
- End with one or two concrete places to cut back, tied to a specific category and a rough amount.
- Write plainly to the person, second person. Do not moralise, do not congratulate, do not repeat the numbers twice, do not add a closing pep talk.
- If there is little or no data, say so in one sentence instead of inventing a pattern.
- Both versions must carry the same meaning and the same numbers, but read naturally in their own language rather than being a word-for-word translation of one another.`;

type Bilingual = { en: string; uz: string };

const EMPTY_TEXT: Record<"week" | "month", Bilingual> = {
  week: {
    en: "Nothing logged this week yet, so there is no pattern to read. Log a few expenses and check back.",
    uz: "Bu hafta hali hech narsa qayd etilmagan, shuning uchun tahlil qiladigan narsa yo'q. Bir nechta xarajat kiritib, keyin qayta tekshiring.",
  },
  month: {
    en: "Nothing logged this month yet, so there is no pattern to read. Log a few expenses and check back.",
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

  lines.push("", 'Write the summary as JSON: {"en": "...", "uz": "..."}.');
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  // Auth first — this endpoint spends money on every call.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let period: "week" | "month" = "week";
  try {
    const body = await request.json();
    if (body?.period === "month") period = "month";
  } catch {
    // Default to the week.
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
    return Response.json({ ...EMPTY_TEXT[period], generatedAt: new Date().toISOString() });
  }

  const periodLabel =
    period === "week"
      ? `week of ${formatDayMonth(currentRange.from)} to ${formatDayMonth(currentRange.to)}`
      : formatMonthYear(currentRange.from);
  const previousLabel = period === "week" ? "last week" : "last month";

  const openai = new OpenAI();

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildPrompt(periodLabel, previousLabel, current, previous),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return Response.json({ error: "The model returned no text." }, { status: 502 });
    }

    let parsed: Partial<Bilingual>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: "The model returned malformed JSON." }, { status: 502 });
    }

    const en = parsed.en?.trim();
    const uz = parsed.uz?.trim();
    if (!en || !uz) {
      return Response.json(
        { error: "The model response was missing a language." },
        { status: 502 },
      );
    }

    // Best-effort: a generated summary is still worth returning even if this
    // Supabase project hasn't had the `insights` migration applied yet.
    const generatedAt = await saveInsight({
      period,
      periodStart: currentRange.from,
      textEn: en,
      textUz: uz,
    })
      .then((saved) => saved.created_at)
      .catch(() => new Date().toISOString());

    return Response.json({ en, uz, generatedAt, period, periodStart: currentRange.from });
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      return Response.json(
        { error: "Rate limited by OpenAI. Try again in a moment." },
        { status: 429 },
      );
    }
    if (error instanceof OpenAI.AuthenticationError) {
      return Response.json({ error: "Invalid OPENAI_API_KEY." }, { status: 500 });
    }
    if (error instanceof OpenAI.NotFoundError) {
      return Response.json(
        { error: `Model "${MODEL}" is not available on this account.` },
        { status: 502 },
      );
    }
    if (error instanceof OpenAI.APIError) {
      return Response.json(
        { error: `OpenAI API error (${error.status}): ${error.message}` },
        { status: 502 },
      );
    }
    return Response.json({ error: "Could not generate insights." }, { status: 500 });
  }
}
