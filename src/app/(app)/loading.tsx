import { Card, Skeleton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function AddLoading() {
  const { t } = await getT();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Skeleton className="h-40" />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
      </div>

      <Card title={t.home.loggedToday}>
        <Skeleton className="h-24" />
      </Card>
    </div>
  );
}
