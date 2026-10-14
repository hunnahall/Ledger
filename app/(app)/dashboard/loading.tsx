import {
  PageHeaderSkeleton,
  Skeleton,
  SkeletonCard,
} from "@/components/ui/skeleton";

// Mirrors the Dashboard's three rows: a wide card and a narrow one in each,
// the third row's narrow side being a stack (funding, float, 4 months).
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton title="Dashboard" />

      <div className="flex flex-wrap gap-4">
        <SkeletonCard className="min-w-0 flex-[999_1_560px]">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-11 w-44" />
          <Skeleton className="mt-6 h-40 w-full" />
        </SkeletonCard>
        <SkeletonCard className="min-w-0 flex-[1_1_380px]">
          <Skeleton className="h-4 w-24" />
          <div className="mt-5 flex gap-7">
            <Skeleton className="ml-3 h-64 w-16" />
            <div className="flex flex-1 flex-col justify-center gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-3.5 w-full" />
              ))}
            </div>
          </div>
        </SkeletonCard>
      </div>

      <div className="flex flex-wrap gap-4">
        <SkeletonCard className="min-w-0 flex-[999_1_560px]">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-36 w-full" />
        </SkeletonCard>
        <SkeletonCard className="min-w-0 flex-[1_1_380px]">
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 flex items-center gap-5">
            <Skeleton className="size-[120px] rounded-full" />
            <div className="flex flex-1 flex-col gap-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-3.5 w-full" />
              ))}
            </div>
          </div>
        </SkeletonCard>
      </div>

      <div className="flex flex-wrap gap-4">
        <SkeletonCard className="min-w-0 flex-[999_1_560px]">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex flex-col gap-5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <SkeletonCard>
            <Skeleton className="h-4 w-32" />
            <div className="mt-3.5 flex items-center gap-6">
              <Skeleton className="size-[100px] rounded-full" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-2 h-7 w-28" />
          </SkeletonCard>
          <SkeletonCard>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-28 w-full" />
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
