import { Card, EmptyState, StatTile } from "@/components/ui";
import { CategoryBars } from "@/components/category-bars";
import { DailyLine, type DailyPoint } from "@/components/daily-line";
import { ExpenseList } from "@/components/expense-list";
import { addDays, formatDayMonth, today, weekRange, weekdayShort } from "@/lib/dates";
import { percentChange } from "@/lib/money";
import {
  getCategories,
  getExpensesInRange,
  sumExpenses,
  totalsByCategory,
  totalsByDay,
} from "@/lib/queries";

export const metadata = { title: "This week — Xarajat" };

export default async function WeekPage() {
  const now = today();
  const thisWeek = weekRange(now);
  const lastWeek = weekRange(addDays(thisWeek.from, -7));

  const [categories, current, previous] = await Promise.all([
    getCategories(),
    getExpensesInRange(thisWeek),
    getExpensesInRange(lastWeek),
  ]);

  const currentTotal = sumExpenses(current);
  const previousTotal = sumExpenses(previous);
  const change = percentChange(currentTotal, previousTotal);

  const currentDays = totalsByDay(current, thisWeek);
  const previousDays = totalsByDay(previous, lastWeek);

  const points: DailyPoint[] = currentDays.map((day, i) => ({
    label: weekdayShort(day.date),
    current: day.total,
    previous: previousDays[i]?.total ?? null,
  }));

  const byCategory = totalsByCategory(current);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight">This week</h1>
        <p className="text-sm text-ink-3">
          {formatDayMonth(thisWeek.from)} – {formatDayMonth(thisWeek.to)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="This week"
          value={currentTotal}
          delta={change}
          deltaLabel="vs last week"
        />
        <StatTile label="Last week" value={previousTotal} />
      </div>

      <Card title="Daily spending">
        {currentTotal === 0 && previousTotal === 0 ? (
          <EmptyState>No spending logged in the last two weeks.</EmptyState>
        ) : (
          <DailyLine data={points} currentLabel="This week" previousLabel="Last week" />
        )}
      </Card>

      <Card title="By category">
        {byCategory.length === 0 ? (
          <EmptyState>Nothing logged this week yet.</EmptyState>
        ) : (
          <CategoryBars totals={byCategory} />
        )}
      </Card>

      <Card title="This week's expenses">
        {current.length === 0 ? (
          <EmptyState>Nothing logged this week yet.</EmptyState>
        ) : (
          <ExpenseList expenses={current} categories={categories} />
        )}
      </Card>
    </div>
  );
}
