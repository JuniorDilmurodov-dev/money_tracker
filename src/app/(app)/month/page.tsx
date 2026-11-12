import Link from "next/link";

import { Card, EmptyState, StatTile } from "@/components/ui";
import { CategoryBars } from "@/components/category-bars";
import { CurrencyTabs } from "@/components/currency-tabs";
import { DailyLine, type DailyPoint } from "@/components/daily-line";
import {
  addMonths,
  daysBetween,
  formatMonthYear,
  monthRange,
  today,
} from "@/lib/dates";
import { formatSom, percentChange } from "@/lib/money";
import { formatTotals, percentChangeByCurrency, pickCurrency } from "@/lib/currency";
import {
  getMonthlyBudget,
  getExpensesInRange,
  inCurrency,
  sumByCurrency,
  sumExpenses,
  totalsByCategory,
  totalsByDay,
} from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { translateCategory } from "@/lib/i18n/categories";
import type { Dictionary } from "@/lib/i18n";
import { CURRENCIES, type Totals } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.month };
}

function BudgetProgress({
  spent,
  budget,
  t,
}: {
  spent: number;
  budget: number;
  t: Dictionary;
}) {
  const pct = (spent / budget) * 100;
  const over = spent > budget;
  const remaining = budget - spent;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="tnum text-sm">
          {formatSom(spent, t)}{" "}
          <span className="text-ink-3">{t.month.budgetOf(formatSom(budget, t))}</span>
        </span>
        <span className="tnum text-sm font-medium">{Math.round(pct)}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Math.min(spent, budget)}
        aria-label={t.month.budgetUsed}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: over ? "var(--danger)" : "var(--series-1)",
          }}
        />
      </div>
      <p className="mt-2 text-sm text-pretty text-ink-2">
        {over ? (
          <>
            {t.month.overBudget}{" "}
            <span className="tnum font-medium" style={{ color: "var(--danger)" }}>
              {formatSom(-remaining, t)}
            </span>
            .
          </>
        ) : (
          <>
            <span className="tnum font-medium">{formatSom(remaining, t)}</span>{" "}
            {t.month.leftThisMonth}
          </>
        )}
      </p>
    </div>
  );
}

export default async function MonthPage(props: PageProps<"/month">) {
  const { cur } = await props.searchParams;
  const { locale, t } = await getT();
  const now = today();
  const thisMonth = monthRange(now);
  const lastMonth = monthRange(addMonths(thisMonth.from, -1));

  const [budget, current, previous] = await Promise.all([
    getMonthlyBudget(),
    getExpensesInRange(thisMonth),
    getExpensesInRange(lastMonth),
  ]);

  // Totals are per currency and never added together: the chart, the
  // category breakdown and the daily line all show one currency at a time.
  const currentTotals = sumByCurrency(current);
  const previousTotals = sumByCurrency(previous);
  const currency = pickCurrency(cur, currentTotals, previousTotals);
  const showTabs = CURRENCIES.every((c) => currentTotals[c] + previousTotals[c] > 0);
  const currentCur = inCurrency(current, currency);
  const previousCur = inCurrency(previous, currency);

  const currentTotal = sumExpenses(currentCur);
  const previousTotal = sumExpenses(previousCur);
  const change = percentChange(currentTotal, previousTotal);

  const currentDays = totalsByDay(currentCur, thisMonth);
  const previousDays = totalsByDay(previousCur, lastMonth);

  const points: DailyPoint[] = currentDays.map((day, i) => ({
    label: String(Number(day.date.slice(8, 10))),
    current: day.total,
    previous: previousDays[i]?.total ?? null,
  }));

  const byCategory = totalsByCategory(currentCur);
  const top = byCategory[0];

  const daysElapsed = daysBetween(thisMonth.from, now) + 1;
  // Averaged per currency: so'm to whole so'm, USD to cents.
  const dailyAverages: Totals = {
    UZS: Math.round(currentTotals.UZS / Math.max(daysElapsed, 1)),
    USD: Math.round((currentTotals.USD / Math.max(daysElapsed, 1)) * 100) / 100,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight">
          {formatMonthYear(now, locale)}
        </h1>
        <p className="text-sm text-ink-3">
          {t.month.dayCount(daysElapsed)} ·{" "}
          {t.month.dailyAverage(formatTotals(dailyAverages, t))}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label={t.month.thisMonth}
          value={currentTotal}
          currency={t.currency}
          delta={change}
          deltaLabel={t.month.vsLastMonth}
          totals={currentTotals}
          t={t}
          deltas={percentChangeByCurrency(currentTotals, previousTotals)}
        />
        <StatTile
          label={formatMonthYear(lastMonth.from, locale)}
          value={previousTotal}
          currency={t.currency}
          totals={previousTotals}
          t={t}
        />
      </div>

      <Card
        title={t.month.budget}
        action={
          <Link href="/settings" className="text-xs text-ink-3 hover:text-ink-2">
            {budget ? t.month.change : t.month.setBudget}
          </Link>
        }
      >
        {budget ? (
          <BudgetProgress spent={currentTotals.UZS} budget={budget} t={t} />
        ) : (
          <EmptyState>
            {t.month.noBudget}{" "}
            <Link href="/settings" className="underline">
              {t.month.addBudget}
            </Link>{" "}
            {t.month.toTrackRemaining}
          </EmptyState>
        )}
      </Card>

      <Card
        title={t.month.dailySpending}
        action={showTabs ? <CurrencyTabs active={currency} t={t} /> : undefined}
      >
        {currentTotal === 0 && previousTotal === 0 ? (
          <EmptyState>{t.month.nothingTwoMonths}</EmptyState>
        ) : (
          <DailyLine
            data={points}
            currency={currency}
            currentLabel={t.month.thisMonth}
            previousLabel={t.month.lastMonth}
          />
        )}
      </Card>

      <Card title={t.month.byCategory}>
        {byCategory.length === 0 ? (
          <EmptyState>{t.month.nothingThisMonth}</EmptyState>
        ) : (
          <>
            {top &&
              (() => {
                // Split into three parts so the share can stay emphasised
                // wherever a language puts it in the sentence.
                const line = t.month.topCategory(
                  translateCategory(top.category, t),
                  Math.round(top.share),
                );
                return (
                  <p className="mb-4 text-sm text-pretty text-ink-2">
                    {line.before}
                    <span className="tnum font-semibold text-ink">{line.value}</span>
                    {line.after}
                  </p>
                );
              })()}
            <CategoryBars totals={byCategory} t={t} currency={currency} />
          </>
        )}
      </Card>
    </div>
  );
}
