import { PageHeaderSkeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Sources"
        subtitle="Your buckets that pay for transactions."
      />
      <SkeletonCard className="p-4" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
