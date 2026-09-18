import {
  PageHeaderSkeleton,
  Skeleton,
  SkeletonCard,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Settings" subtitle={null} />
      <SkeletonCard />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} className="min-w-56 flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-40" />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
