import {
  PageHeaderSkeleton,
  SkeletonCard,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Accounts"
        subtitle="Your bank accounts and manual balances."
      />
      <SkeletonTable rows={5} />
      <SkeletonCard />
    </div>
  );
}
