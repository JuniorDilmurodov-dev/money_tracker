import Link from "next/link";

import { Card, EmptyState } from "@/components/ui";
import { ExpenseList } from "@/components/expense-list";
import { QuickAdd } from "@/components/quick-add";
import { today, weekRange } from "@/lib/dates";
import { formatSom } from "@/lib/money";
import { getCategories, getExpensesInRange, sumExpenses } from "@/lib/queries";

export const metadata = { title: "Add expense — Xarajat" };

export default async function AddPage() {
  const now = today();
  const week = weekRange(now);

  const [categories, weekExpenses] = await Promise.all([
    getCategories(),
    getExpensesInRange(week),
  ]);

  const todays = weekExpenses.filter((e) => e.spent_on === now);
  const todayTotal = sumExpenses(todays);
  const weekTotal = sumExpenses(weekExpenses);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <QuickAdd categories={categories} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface-1 px-4 py-3">
          <div className="text-xs text-ink-3">Today</div>
          <div className="tnum mt-1 text-tile font-semibold">{formatSom(todayTotal)}</div>
        </div>
        <Link
          href="/week"
          className="rounded-2xl border border-line bg-surface-1 px-4 py-3 transition-colors hover:border-line-strong"
        >
          <div className="text-xs text-ink-3">This week</div>
          <div className="tnum mt-1 text-tile font-semibold">{formatSom(weekTotal)}</div>
        </Link>
      </div>

      <Card title="Logged today">
        {todays.length === 0 ? (
          <EmptyState>Nothing logged today yet.</EmptyState>
        ) : (
          <ExpenseList expenses={todays} categories={categories} showDate={false} />
        )}
      </Card>
    </div>
  );
}
