import { PageHeaderSkeleton, SkeletonCard, SkeletonStatRow } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Sources" />
      <SkeletonStatRow count={4} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}
