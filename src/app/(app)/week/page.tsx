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
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.week };
}

export default async function WeekPage() {
  const { locale, t } = await getT();
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
    label: weekdayShort(day.date, locale),
    current: day.total,
    previous: previousDays[i]?.total ?? null,
  }));

  const byCategory = totalsByCategory(current);

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
        />
        <StatTile label={t.week.lastWeek} value={previousTotal} currency={t.currency} />
      </div>

      <Card title={t.week.dailySpending}>
        {currentTotal === 0 && previousTotal === 0 ? (
          <EmptyState>{t.week.nothingTwoWeeks}</EmptyState>
        ) : (
          <DailyLine
            data={points}
            currentLabel={t.week.thisWeek}
            previousLabel={t.week.lastWeek}
          />
        )}
      </Card>

      <Card title={t.week.byCategory}>
        {byCategory.length === 0 ? (
          <EmptyState>{t.week.nothingThisWeek}</EmptyState>
        ) : (
          <CategoryBars totals={byCategory} t={t} />
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
