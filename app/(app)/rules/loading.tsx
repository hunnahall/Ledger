import { PageHeaderSkeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Rules" />
      <SkeletonTable rows={6} />
    </div>
  );
}
