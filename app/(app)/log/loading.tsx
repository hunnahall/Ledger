import { PageHeaderSkeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Log"
        subtitle="Manual changes made on the Budgets, Sources, and Accounts pages — not Transactions, which already keeps its own record on each transaction."
      />
      <SkeletonTable rows={12} />
    </div>
  );
}
