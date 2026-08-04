import { Card, Skeleton } from "@/components/ui";

export default function MonthLoading() {
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

      <Card title="Budget">
        <Skeleton className="h-16" />
      </Card>

      <Card title="Daily spending">
        <Skeleton className="h-40" />
      </Card>

      <Card title="By category">
        <Skeleton className="h-24" />
      </Card>
    </div>
  );
}
