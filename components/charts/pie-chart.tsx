"use client";

import { Money } from "@/components/ui/money";
import { buildSourcePie, type PieSlice } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";

const SIZE = 140;

const FILL: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "fill-chart-1",
  2: "fill-chart-2",
  3: "fill-chart-3",
  4: "fill-chart-4",
  5: "fill-chart-5",
  none: "fill-chart-neutral",
};
const SWATCH: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
  none: "bg-chart-neutral",
};

// A pie of amounts: five series at most, the rest grouped as Other. The
// legend lists every item with its share and amount; each row and slice that
// maps to something real is a button.
export function PieChart({
  items,
  decimalPlaces,
  onSelect,
  ariaLabel,
}: {
  items: { id: string; name: string; amount: number; selectable?: boolean }[];
  decimalPlaces: number;
  onSelect?: (id: string) => void;
  ariaLabel: string;
}) {
  const { total, slices, legend } = buildSourcePie(
    items.map((i) => ({ id: i.id, name: i.name, spent: i.amount })),
    { size: SIZE },
  );
  const selectable = new Map(items.map((i) => [i.id, i.selectable !== false]));
  const pct = (share: number) => `${Math.round(share * 100)}%`;

  if (total <= 0) return <p className="text-sm text-muted">Nothing allocated yet.</p>;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={140} height={140} viewBox={`0 0 ${SIZE} ${SIZE}`} className="flex-none" role="img" aria-label={ariaLabel}>
        {slices.map(
          (s) =>
            s.path && (
              <path
                key={s.key}
                d={s.path}
                className={cn(
                  FILL[s.tone ?? "none"],
                  "stroke-surface",
                  onSelect && selectable.get(s.key) && "cursor-pointer hover:opacity-80",
                )}
                strokeWidth={1}
                strokeLinejoin="miter"
                onClick={() => onSelect && selectable.get(s.key) && onSelect(s.key)}
              />
            ),
        )}
      </svg>
      <ul className="flex min-w-[200px] flex-1 flex-col text-[13px] tabular-nums">
        {legend.map((r) => {
          const row = (
            <>
              <span aria-hidden="true" className={cn("size-2.5 flex-none", SWATCH[r.tone ?? "none"])} />
              <span className="flex-1 truncate">{r.name}</span>
              <span className="font-mono text-xs text-muted">{pct(r.share)}</span>
              <span className="w-24 text-right">
                <Money amount={r.amount} decimalPlaces={decimalPlaces} />
              </span>
            </>
          );
          const cls = "flex min-h-8 w-full items-center gap-2 border-b border-border px-1.5 text-left last:border-0";
          return (
            <li key={r.id}>
              {onSelect && selectable.get(r.id) ? (
                <button type="button" onClick={() => onSelect(r.id)} className={cn(cls, "hover:bg-fill-hover")}>
                  {row}
                </button>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
