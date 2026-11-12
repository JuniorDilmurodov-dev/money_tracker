import { Card, EmptyState, StatTile } from "@/components/ui";
import { CategoryBars } from "@/components/category-bars";
import { CurrencyTabs } from "@/components/currency-tabs";
import { DailyLine, type DailyPoint } from "@/components/daily-line";
import { ExpenseList } from "@/components/expense-list";
import { addDays, formatDayMonth, today, weekRange, weekdayShort } from "@/lib/dates";
import { percentChange } from "@/lib/money";
import { percentChangeByCurrency, pickCurrency } from "@/lib/currency";
import {
  getCategories,
  getExpensesInRange,
  inCurrency,
  sumByCurrency,
  sumExpenses,
  totalsByCategory,
  totalsByDay,
} from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { CURRENCIES } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.week };
}

export default async function WeekPage(props: PageProps<"/week">) {
  const { cur } = await props.searchParams;
  const { locale, t } = await getT();
  const now = today();
  const thisWeek = weekRange(now);
  const lastWeek = weekRange(addDays(thisWeek.from, -7));

  const [categories, current, previous] = await Promise.all([
    getCategories(),
    getExpensesInRange(thisWeek),
    getExpensesInRange(lastWeek),
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

  const currentDays = totalsByDay(currentCur, thisWeek);
  const previousDays = totalsByDay(previousCur, lastWeek);

  const points: DailyPoint[] = currentDays.map((day, i) => ({
    label: weekdayShort(day.date, locale),
    current: day.total,
    previous: previousDays[i]?.total ?? null,
  }));

  const byCategory = totalsByCategory(currentCur);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight">{t.week.title}</h1>
        <p className="text-sm text-ink-3">
          {formatDayMonth(thisWeek.from, locale)} – {formatDayMonth(thisWeek.to, locale)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label={t.week.thisWeek}
          value={currentTotal}
          currency={t.currency}
          delta={change}
          deltaLabel={t.week.vsLastWeek}
          totals={currentTotals}
          t={t}
          deltas={percentChangeByCurrency(currentTotals, previousTotals)}
        />
        <StatTile
          label={t.week.lastWeek}
          value={previousTotal}
          currency={t.currency}
          totals={previousTotals}
          t={t}
        />
      </div>

      <Card
        title={t.week.dailySpending}
        action={showTabs ? <CurrencyTabs active={currency} t={t} /> : undefined}
      >
        {currentTotal === 0 && previousTotal === 0 ? (
          <EmptyState>{t.week.nothingTwoWeeks}</EmptyState>
        ) : (
          <DailyLine
            data={points}
            currency={currency}
            currentLabel={t.week.thisWeek}
            previousLabel={t.week.lastWeek}
          />
        )}
      </Card>

      <Card title={t.week.byCategory}>
        {byCategory.length === 0 ? (
          <EmptyState>{t.week.nothingThisWeek}</EmptyState>
        ) : (
          <CategoryBars totals={byCategory} t={t} currency={currency} />
        )}
      </Card>

      <Card title={t.week.expenses}>
        {current.length === 0 ? (
          <EmptyState>{t.week.nothingThisWeek}</EmptyState>
        ) : (
          <ExpenseList expenses={current} categories={categories} />
        )}
      </Card>
    </div>
  );
}
