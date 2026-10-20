import { PageHeaderSkeleton, SkeletonCard, SkeletonStatRow, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Budget" />
      <SkeletonStatRow count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
      <SkeletonTable rows={8} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonTable rows={4} />
        <SkeletonTable rows={3} />
      </div>
    </div>
  );
}
