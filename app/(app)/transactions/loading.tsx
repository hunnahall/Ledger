import {
  PageHeaderSkeleton,
  SkeletonCard,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Transactions" subtitle="Your income and expenses." />
      <SkeletonCard className="p-4" />
      <SkeletonTable rows={12} />
    </div>
  );
}
