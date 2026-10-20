import { PageHeaderSkeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Transactions" />
      <SkeletonCard className="h-[196px]" />
      <SkeletonTable rows={12} />
    </div>
  );
}
