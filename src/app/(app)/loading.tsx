import { Card, Skeleton } from "@/components/ui";

export default function AddLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Skeleton className="h-40" />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
      </div>

      <Card title="Logged today">
        <Skeleton className="h-24" />
      </Card>
    </div>
  );
}
