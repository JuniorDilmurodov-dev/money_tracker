import { Card, Skeleton } from "@/components/ui";

export default function WeekLoading() {
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

      <Card title="Daily spending">
        <Skeleton className="h-40" />
      </Card>

      <Card title="By category">
        <Skeleton className="h-24" />
      </Card>

      <Card title="This week's expenses">
        <Skeleton className="h-32" />
      </Card>
    </div>
  );
}
