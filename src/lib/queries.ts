// Server-only: every function here creates a cookie-bound Supabase client.
import { createClient } from "@/lib/supabase/server";
import type { ISODate, Range } from "@/lib/dates";
import { eachDay } from "@/lib/dates";
import type { Category, CategoryTotal, DailyTotal, Expense } from "@/lib/types";

/** PostgREST can hand back `numeric` as a string — always coerce. */
function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    amount: num(row.amount),
    category: row.category as string,
    spent_on: row.spent_on as ISODate,
    note: (row.note as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return (data ?? []) as Category[];
}

export async function getMonthlyBudget(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("monthly_budget")
    .maybeSingle();

  if (error) throw new Error(`Could not load settings: ${error.message}`);
  const budget = data?.monthly_budget;
  return budget === null || budget === undefined ? null : num(budget);
}

export async function getExpensesInRange(range: Range): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, category, spent_on, note, created_at")
    .gte("spent_on", range.from)
    .lte("spent_on", range.to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load expenses: ${error.message}`);
  return (data ?? []).map(toExpense);
}

export type ExpenseFilters = {
  from?: ISODate;
  to?: ISODate;
  category?: string;
  limit?: number;
};

export async function searchExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("id, amount, category, spent_on, note, created_at")
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.from) query = query.gte("spent_on", filters.from);
  if (filters.to) query = query.lte("spent_on", filters.to);
  if (filters.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load expenses: ${error.message}`);
  return (data ?? []).map(toExpense);
}

// ---------------------------------------------------------------------------
// Aggregation — done in JS. At personal-tracker volume (a few thousand rows a
// year) this is far cheaper than a round trip per breakdown.
// ---------------------------------------------------------------------------

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((acc, e) => acc + e.amount, 0);
}

export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const total = sumExpenses(expenses);
  const byCategory = new Map<string, number>();

  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }

  return [...byCategory.entries()]
    .map(([category, sum]) => ({
      category,
      total: sum,
      share: total > 0 ? (sum / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** One entry per day in the range, including days with no spending. */
export function totalsByDay(expenses: Expense[], range: Range): DailyTotal[] {
  const byDay = new Map<ISODate, number>();
  for (const e of expenses) {
    byDay.set(e.spent_on, (byDay.get(e.spent_on) ?? 0) + e.amount);
  }
  return eachDay(range.from, range.to).map((date) => ({
    date,
    total: byDay.get(date) ?? 0,
  }));
}
