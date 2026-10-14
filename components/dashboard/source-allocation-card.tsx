"use client";

import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { buildSourcePie, type PieSlice } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";

const SIZE = 140;

const FILL: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "fill-chart-1",
  2: "fill-chart-2",
  3: "fill-chart-3",
  4: "fill-chart-4",
  none: "fill-chart-neutral",
};
const DOT: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  none: "bg-chart-neutral",
};

// Share of this month's spending that came from each source — gross outflows
// only (getDashboardData's sourceOutflows), so the slices sum to total
// outflows. Every source is listed; ones with no spending show at $0.
export function SourceAllocationCard({
  sources,
  monthISO,
  decimalPlaces,
}: {
  sources: { id: string; name: string; spent: number }[];
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);
  const { total, slices, legend } = buildSourcePie(sources, { size: SIZE });
  const spending = legend.filter((r) => r.amount > 0);
  const idle = legend.filter((r) => r.amount <= 0);
  const pct = (share: number) => `${Math.round(share * 100)}%`;

  return (
    <section className="flex min-w-0 flex-[1_1_380px] flex-col rounded-lg border border-card-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="whitespace-nowrap text-base font-semibold">Source Allocation</h2>
        <span className="whitespace-nowrap text-xs text-muted">
          <Money amount={total} decimalPlaces={decimalPlaces} /> spent
        </span>
      </div>

      {total <= 0 ? (
        <p className="text-sm text-muted">No spending this month yet.</p>
      ) : (
        <div className="flex flex-1 flex-wrap items-center gap-5">
          <svg
            width={120}
            height={120}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="flex-none"
            role="img"
            aria-label={`Share of spending by source: ${slices.map((s) => `${s.label} ${pct(s.share)}`).join(", ")}.`}
          >
            {slices.map(
              (s) =>
                s.path && (
                  <path
                    key={s.key}
                    d={s.path}
                    className={cn(FILL[s.tone ?? "none"], "stroke-surface")}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                ),
            )}
          </svg>

          <div className="flex min-w-[150px] flex-1 flex-col gap-1 text-sm tabular-nums">
            {spending.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openTile(r.name, { type: "source", sourceId: r.id })}
                className="-mx-1.5 flex min-h-7 items-center gap-2 rounded-md px-1.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                <span aria-hidden="true" className={cn("size-2.5 flex-none rounded-full", DOT[r.tone ?? "none"])} />
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-muted">{pct(r.share)}</span>
                <span className="w-16 text-right font-semibold">
                  <Money amount={r.amount} decimalPlaces={decimalPlaces} />
                </span>
              </button>
            ))}
            {idle.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-paper-4 pt-1.5 text-xs text-paper-7">
                {idle.map((r) => (
                  <span key={r.id} className="whitespace-nowrap">
                    {r.name} <Money amount={0} decimalPlaces={decimalPlaces} />
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      )}
      {modal}
    </section>
  );
}
