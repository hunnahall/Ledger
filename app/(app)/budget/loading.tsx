import { PageHeaderSkeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Budget"
        subtitle="Your transactions' categories."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonTable rows={8} />
        <div className="flex flex-col gap-6">
          <SkeletonTable rows={4} />
          <SkeletonTable rows={3} />
        </div>
      </div>
    </div>
  );
}
