import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// A page's headline figures: mono label, 28px tabular figure, optional 12px
// line under it. StatRow puts them side by side in one Level 1 panel split
// by hairlines, and stacks them under 640px.
export function Stat({
  label,
  value,
  caption,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  /** "danger" only for an over-limit figure, per the design system. */
  tone?: "danger";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-5 py-4", className)}>
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={cn("mt-1 truncate text-[28px] font-semibold leading-tight tabular-nums", tone === "danger" && "text-danger")}>
        {value}
      </div>
      {caption != null && (
        <div className="mt-1 truncate font-mono text-xs text-foreground-secondary tabular-nums">{caption}</div>
      )}
    </div>
  );
}

export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 divide-y divide-border border border-border bg-surface",
        "sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
