import type { ISODate } from "@/lib/dates";
import type { Locale } from "@/lib/i18n/config";

export const CURRENCIES = ["UZS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Per-currency totals. Never add the two together. */
export type Totals = Record<Currency, number>;

export type Expense = {
  id: string;
  amount: number;
  category: string;
  spent_on: ISODate;
  note: string | null;
  created_at: string;
  currency: Currency;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type CategoryTotal = {
  category: string;
  total: number;
  /** Share of the period total, 0–100. */
  share: number;
};

export type DailyTotal = {
  date: ISODate;
  total: number;
};

/**
 * The four periods the panel can generate for. Rows written before this
 * split only ever hold "week" or "month" — the app treats those as
 * this_week/this_month wherever a period is read back.
 */
export type InsightPeriod = "this_week" | "last_week" | "this_month" | "last_month";

/**
 * An insight is generated in one language and stored in the column for it.
 *
 * Rows written before the language picker existed carry English *and* Uzbek
 * with no `lang` — `insightText()` reads both shapes.
 */
export type Insight = {
  id: string;
  period: InsightPeriod | "week" | "month";
  period_start: ISODate;
  lang: Locale | null;
  text_en: string | null;
  text_ru: string | null;
  text_uz: string | null;
  created_at: string;
};

/**
 * Result shape returned by every Server Action in this app.
 * `message` carries a non-error notice on success (e.g. "confirm your email"),
 * so the UI never has to render informational text as a failure.
 */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };
