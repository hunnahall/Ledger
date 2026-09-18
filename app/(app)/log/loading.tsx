import { PageHeaderSkeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Log"
        subtitle="Track manual changes made throughout the app."
      />
      <SkeletonTable rows={12} />
    </div>
  );
}
