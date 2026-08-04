import type { ISODate } from "@/lib/dates";

export type Expense = {
  id: string;
  amount: number;
  category: string;
  spent_on: ISODate;
  note: string | null;
  created_at: string;
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

export type Insight = {
  id: string;
  period: "week" | "month";
  period_start: ISODate;
  text_en: string;
  text_uz: string;
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
