import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const DOT: Record<BadgeTone, string> = {
  neutral: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

// A hairline outline, a 6px dot and a word: status is never color alone.
export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 border border-border px-2 text-xs text-foreground-secondary",
        className,
      )}
      {...props}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}
