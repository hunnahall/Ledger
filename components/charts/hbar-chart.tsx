"use client";

import { cn } from "@/lib/cn";

type HBarRow = {
  key: string;
  label: string;
  value: number;
  /** The budget or target for this row, drawn as a dashed reference tick. */
  target?: number;
  valueLabel: string;
};

// Horizontal bars, one per row, scaled to the largest value or target. A bar
// past its target turns --danger; otherwise the series is the signature color.
export function HBarChart({
  rows,
  onSelect,
  ariaLabel,
}: {
  rows: HBarRow[];
  onSelect?: (key: string) => void;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.value, r.target ?? 0]));

  return (
    <div role="list" aria-label={ariaLabel} className="flex flex-col">
      {rows.map((r) => {
        const over = r.target !== undefined && r.value > r.target;
        const body = (
          <>
            <span className="truncate text-[13px] font-medium">{r.label}</span>
            <span aria-hidden="true" className="relative h-2 bg-fill-active">
              <span
                className={cn("absolute inset-y-0 left-0", over ? "bg-danger" : "bg-accent")}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
              {r.target !== undefined && (
                <span
                  className="absolute -top-1 h-4 border-l border-dashed border-foreground-secondary"
                  style={{ left: `${(r.target / max) * 100}%` }}
                />
              )}
            </span>
            <span className="text-right font-mono text-xs tabular-nums text-foreground-secondary">{r.valueLabel}</span>
          </>
        );
        const cls =
          "grid min-h-9 grid-cols-[minmax(90px,140px)_minmax(0,1fr)_minmax(90px,auto)] items-center gap-4 border-b border-border py-1.5 text-left last:border-0";
        return (
          <div role="listitem" key={r.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(r.key)}
                aria-label={`${r.label}: ${r.valueLabel}. Show transactions.`}
                className={cn(cls, "w-full transition-colors duration-[120ms] hover:bg-fill-hover")}
              >
                {body}
              </button>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
