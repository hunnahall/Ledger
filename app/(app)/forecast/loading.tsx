import { PageHeaderSkeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Forecast"
        subtitle="Create Forecasts that project a Source's balance forward, given transfers and transactions."
      />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} className="p-4" />
        ))}
      </div>
    </div>
  );
}
