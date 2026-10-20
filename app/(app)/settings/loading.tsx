import { PageHeaderSkeleton, Skeleton, SkeletonCard } from "@/components/ui/skeleton";

const PANELS = [2, 2, 4];

export default function Loading() {
  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <PageHeaderSkeleton title="Settings" subtitle="Bank connections are on the Accounts page." />
      {PANELS.map((rows, i) => (
        <SkeletonCard key={i} className="p-0">
          <div className="border-b border-border px-5 py-4">
            <Skeleton className="h-3.5 w-24" />
          </div>
          {Array.from({ length: rows }, (_, j) => (
            <div key={j} className="flex items-center justify-between border-b border-border px-5 py-4 last:border-0">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </SkeletonCard>
      ))}
    </div>
  );
}
