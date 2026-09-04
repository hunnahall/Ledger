import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Placeholder block for route-level loading UI (see app/(app)/&#42;/loading.tsx).
 * Sized by the caller so a skeleton screen matches the shape of the page it
 * stands in for and nothing shifts when the real content swaps in.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-paper-a3", className)}
    />
  );
}

/** A run of text-height bars, for standing in for a paragraph or a cell. */
export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * The page header, rendered for real. Title and subtitle are static strings
 * on every route (see app/(app)/&#42;/page.tsx), so showing them rather than a
 * grey bar means nothing shifts when the body swaps in.
 */
export function PageHeaderSkeleton({
  title,
  subtitle,
}: {
  title: string;
  /** The page's real subtitle. Omit when the page computes it (a bar stands
   * in); pass null when the page has none, so no bar appears and vanishes. */
  subtitle?: string | null;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle === undefined && <Skeleton className="mt-2 h-4 w-56" />}
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

/** Stands in for a Card: same border, padding and elevation. */
export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-card-border bg-surface p-6 shadow-card",
        className,
      )}
    >
      {children ?? <SkeletonText lines={3} />}
    </div>
  );
}

/** Stands in for a bordered list or table: header strip plus n rows. */
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-surface-subtle px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
        >
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
