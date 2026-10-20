import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Opts into the lift-and-darken hover. Only for cards that are themselves
   * a click target (a source, an account); a card that just holds content
   * should not react to the pointer. */
  interactive?: boolean;
}

// Level 1 surface: --surface with a hairline and no shadow.
export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "border border-border bg-surface p-5",
        interactive &&
          "transition-[border-color,transform] duration-[120ms] ease-standard hover:-translate-y-px hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
}
