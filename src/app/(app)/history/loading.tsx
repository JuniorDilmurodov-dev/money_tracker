import { Card, Skeleton } from "@/components/ui";

export default function HistoryLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-24" />

      <Card>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </Card>

      <Card>
        <Skeleton className="h-48" />
      </Card>
    </div>
  );
}
