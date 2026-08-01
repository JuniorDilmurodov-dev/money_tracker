import Link from "next/link";

import { Card, EmptyState, StatTile } from "@/components/ui";
import { CategoryBars } from "@/components/category-bars";
import { DailyLine, type DailyPoint } from "@/components/daily-line";
import {
  addMonths,
  daysBetween,
  formatMonthYear,
  monthRange,
  today,
} from "@/lib/dates";
import { formatSom, percentChange } from "@/lib/money";
import {
  getMonthlyBudget,
  getExpensesInRange,
  sumExpenses,
  totalsByCategory,
  totalsByDay,
} from "@/lib/queries";

export const metadata = { title: "This month — Xarajat" };

function BudgetProgress({ spent, budget }: { spent: number; budget: number }) {
  const pct = (spent / budget) * 100;
  const over = spent > budget;
  const remaining = budget - spent;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="tnum text-sm">
          {formatSom(spent)}{" "}
          <span className="text-ink-3">of {formatSom(budget)}</span>
        </span>
        <span className="tnum text-sm font-medium">{Math.round(pct)}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Math.min(spent, budget)}
        aria-label="Monthly budget used"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: over ? "var(--danger)" : "var(--series-1)",
          }}
        />
      </div>
      <p className="mt-2 text-sm text-ink-2">
        {over ? (
          <>
            Over budget by{" "}
            <span className="tnum font-medium" style={{ color: "var(--danger)" }}>
              {formatSom(-remaining)}
            </span>
            .
          </>
        ) : (
          <>
            <span className="tnum font-medium">{formatSom(remaining)}</span> left this
            month.
          </>
        )}
      </p>
    </div>
  );
}

export default async function MonthPage() {
  const now = today();
  const thisMonth = monthRange(now);
  const lastMonth = monthRange(addMonths(thisMonth.from, -1));

  const [budget, current, previous] = await Promise.all([
    getMonthlyBudget(),
    getExpensesInRange(thisMonth),
    getExpensesInRange(lastMonth),
  ]);

  const currentTotal = sumExpenses(current);
  const previousTotal = sumExpenses(previous);
  const change = percentChange(currentTotal, previousTotal);

  const currentDays = totalsByDay(current, thisMonth);
  const previousDays = totalsByDay(previous, lastMonth);

  const points: DailyPoint[] = currentDays.map((day, i) => ({
    label: String(Number(day.date.slice(8, 10))),
    current: day.total,
    previous: previousDays[i]?.total ?? null,
  }));

  const byCategory = totalsByCategory(current);
  const top = byCategory[0];

  const daysElapsed = daysBetween(thisMonth.from, now) + 1;
  const dailyAverage = currentTotal / Math.max(daysElapsed, 1);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{formatMonthYear(now)}</h1>
        <p className="text-sm text-ink-3">
          Day {daysElapsed} · {formatSom(Math.round(dailyAverage))} a day on average
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="This month"
          value={currentTotal}
          delta={change}
          deltaLabel="vs last month"
        />
        <StatTile label={formatMonthYear(lastMonth.from)} value={previousTotal} />
      </div>

      <Card
        title="Budget"
        action={
          <Link href="/settings" className="text-xs text-ink-3 hover:text-ink-2">
            {budget ? "Change" : "Set budget"}
          </Link>
        }
      >
        {budget ? (
          <BudgetProgress spent={currentTotal} budget={budget} />
        ) : (
          <EmptyState>
            No monthly budget set.{" "}
            <Link href="/settings" className="underline">
              Add one
            </Link>{" "}
            to track what&apos;s left.
          </EmptyState>
        )}
      </Card>

      <Card title="Daily spending">
        {currentTotal === 0 && previousTotal === 0 ? (
          <EmptyState>No spending logged in the last two months.</EmptyState>
        ) : (
          <DailyLine
            data={points}
            currentLabel="This month"
            previousLabel="Last month"
          />
        )}
      </Card>

      <Card title="By category">
        {byCategory.length === 0 ? (
          <EmptyState>Nothing logged this month yet.</EmptyState>
        ) : (
          <>
            {top && (
              <p className="mb-4 text-sm text-ink-2">
                {top.category} was{" "}
                <span className="tnum font-semibold text-ink">
                  {Math.round(top.share)}%
                </span>{" "}
                of your spending this month.
              </p>
            )}
            <CategoryBars totals={byCategory} />
          </>
        )}
      </Card>
    </div>
  );
}
