import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Opts into the lift-and-darken hover. Only for cards that are themselves
   * a click target (a source, an account); a card that just holds content
   * should not react to the pointer. */
  interactive?: boolean;
  /** Panel header. With either of these the card gets a header row above a
   * hairline, and the body loses the card's own padding to the header. */
  title?: ReactNode;
  action?: ReactNode;
}

// Level 1 surface: --surface with a hairline and no shadow.
export function Card({ interactive, title, action, className, children, ...props }: CardProps) {
  const hasHeader = title != null || action != null;
  return (
    <div
      className={cn(
        "border border-border bg-surface p-5",
        hasHeader && "p-0",
        interactive &&
          "transition-[border-color,transform] duration-[120ms] ease-standard hover:-translate-y-px hover:border-border-strong",
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <>
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-5 py-2">
            {typeof title === "string" ? <h2 className="text-sm font-semibold">{title}</h2> : title}
            {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
          </div>
          {children}
        </>
      ) : (
        children
      )}
    </div>
  );
}
