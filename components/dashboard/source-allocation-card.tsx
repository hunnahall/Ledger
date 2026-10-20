"use client";

import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { useState } from "react";
import { Donut, TONE_SWATCH } from "@/components/charts/donut";
import { buildSourcePie, type PieTone } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";

const SIZE = 140;

// Share of this month's spending that came from each source — gross outflows
// only (getDashboardData's sourceOutflows), so the slices sum to total
// outflows. Every source is listed; ones with no spending show at $0. Each
// Source keeps its stable color (lib/charts/source-tones.ts), the same one
// the money map gives it.
export function SourceAllocationCard({
  sources,
  tones,
  monthISO,
  decimalPlaces,
}: {
  sources: { id: string; name: string; spent: number }[];
  tones: Record<string, PieTone | null>;
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);
  const { total, slices, legend } = buildSourcePie(sources, { size: SIZE, tones: new Map(Object.entries(tones)) });
  const [active, setActive] = useState<string | null>(null);
  const spending = legend.filter((r) => r.amount > 0);
  const idle = legend.filter((r) => r.amount <= 0);
  const pct = (share: number) => `${Math.round(share * 100)}%`;

  return (
    <section className="flex min-w-0 flex-[1_1_380px] flex-col border border-border bg-surface p-5">
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
          <Donut
            slices={slices}
            viewBox={SIZE}
            size={120}
            active={active}
            onActive={setActive}
            onSelect={(key) => {
              const row = legend.find((r) => r.id === key);
              if (row) openTile(row.name, { type: "source", sourceId: row.id });
            }}
            ariaLabel={`Share of spending by source: ${slices.map((s) => `${s.label} ${pct(s.share)}`).join(", ")}.`}
          />

          <div className="flex min-w-[150px] flex-1 flex-col gap-1 text-sm tabular-nums">
            {spending.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openTile(r.name, { type: "source", sourceId: r.id })}
                onMouseEnter={() => setActive(r.tone === null ? "other" : r.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(r.tone === null ? "other" : r.id)}
                onBlur={() => setActive(null)}
                className="-mx-1.5 flex min-h-7 items-center gap-2 px-1.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
              >
                <span aria-hidden="true" className={cn("size-2.5 flex-none", TONE_SWATCH[r.tone ?? "none"])} />
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-muted">{pct(r.share)}</span>
                <span className="w-16 text-right font-semibold">
                  <Money amount={r.amount} decimalPlaces={decimalPlaces} />
                </span>
              </button>
            ))}
            {idle.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-border pt-1.5 text-xs text-muted">
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
