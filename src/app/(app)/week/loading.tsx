import { Card, Skeleton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function WeekLoading() {
  const { t } = await getT();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-36" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
      </div>

      <Card title={t.week.dailySpending}>
        <Skeleton className="h-40" />
      </Card>

      <Card title={t.week.byCategory}>
        <Skeleton className="h-24" />
      </Card>

      <Card title={t.week.expenses}>
        <Skeleton className="h-32" />
      </Card>
    </div>
  );
}
