import {
  PageHeaderSkeleton,
  Skeleton,
  SkeletonCard,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <SkeletonCard key={i} className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
          </SkeletonCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard>
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
