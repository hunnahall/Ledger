import { PageHeaderSkeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Forecast"
        subtitle="Project a Source's balance forward under its monthly transfer plus any manual entries you add here — read-only against the rest of the app, never writes back to Sources or Budgets."
      />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} className="p-4" />
        ))}
      </div>
    </div>
  );
}
