import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Opts into a hover fill. Only for cards that are themselves a click
   * target (a source, an account) — a card that just holds content should
   * not react to the pointer. */
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-card-border bg-surface p-6 shadow-card",
        interactive &&
          "transition-colors duration-[120ms] ease-standard hover:bg-paper-a1",
        className,
      )}
      {...props}
    />
  );
}
