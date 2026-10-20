import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Every chart and figure card titles itself the same way: a small mono
// uppercase label (the Budget Net look), so the figure is what stands out.
export function ChartTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "whitespace-nowrap font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-muted",
        className,
      )}
    >
      {children}
    </h2>
  );
}
