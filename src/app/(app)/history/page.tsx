import { Card, EmptyState } from "@/components/ui";
import { ExpenseList } from "@/components/expense-list";
import { HistoryFilters } from "./filters";
import { formatTotals } from "@/lib/currency";
import { getCategories, searchExpenses, sumByCurrency } from "@/lib/queries";
import type { ISODate } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.history };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function asDate(value: string | string[] | undefined): ISODate | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && ISO_DATE.test(raw) ? raw : undefined;
}

function asText(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export default async function HistoryPage(props: PageProps<"/history">) {
  const params = await props.searchParams;
  const { t } = await getT();

  const filters = {
    from: asDate(params.from),
    to: asDate(params.to),
    category: asText(params.category),
  };

  const [categories, expenses] = await Promise.all([
    getCategories(),
    searchExpenses({ ...filters, limit: 300 }),
  ]);

  const totals = sumByCurrency(expenses);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-semibold tracking-tight">{t.history.title}</h1>

      <Card>
        <HistoryFilters
          categories={categories}
          initial={{
            from: filters.from ?? "",
            to: filters.to ?? "",
            category: filters.category ?? "",
          }}
        />
      </Card>

      <Card
        title={t.history.expenseCount(expenses.length)}
        action={<span className="tnum text-sm font-semibold">{formatTotals(totals, t)}</span>}
      >
        {expenses.length === 0 ? (
          <EmptyState>{t.history.noMatches}</EmptyState>
        ) : (
          <ExpenseList expenses={expenses} categories={categories} />
        )}
      </Card>

      {expenses.length === 300 && (
        <p className="text-center text-xs text-pretty text-ink-3">{t.history.capped}</p>
      )}
    </div>
  );
}
