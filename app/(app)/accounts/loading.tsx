import { PageHeaderSkeleton, SkeletonStatRow, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Accounts" subtitle="Open an account to see its latest transactions." />
      <SkeletonStatRow count={3} />
      <SkeletonTable rows={4} />
      <SkeletonTable rows={1} />
    </div>
  );
}
