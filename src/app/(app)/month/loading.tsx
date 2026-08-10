import { Card, Skeleton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function MonthLoading() {
  const { t } = await getT();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
      </div>

      <Card title={t.month.budget}>
        <Skeleton className="h-16" />
      </Card>

      <Card title={t.month.dailySpending}>
        <Skeleton className="h-40" />
      </Card>

      <Card title={t.month.byCategory}>
        <Skeleton className="h-24" />
      </Card>
    </div>
  );
}
