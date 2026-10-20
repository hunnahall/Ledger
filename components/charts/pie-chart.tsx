"use client";

import { Money } from "@/components/ui/money";
import { useState } from "react";
import { Donut, TONE_SWATCH } from "@/components/charts/donut";
import { buildSourcePie } from "@/lib/dashboard-charts";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

// A ring of amounts: eight series at most, the rest grouped as Other. The
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
  );
  const selectable = new Map(items.map((i) => [i.id, i.selectable !== false]));
  const [active, setActive] = useState<string | null>(null);
  const select = onSelect && ((id: string) => selectable.get(id) && onSelect(id));
  const pct = (share: number) => `${Math.round(share * 100)}%`;

  if (total <= 0) return <p className="text-sm text-muted">Nothing allocated yet.</p>;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <Donut
        slices={slices}
        size={140}
        ariaLabel={ariaLabel}
        active={active}
        onActive={setActive}
        onSelect={select}
        center={
          <>
            <span className="text-sm font-semibold tabular-nums">{formatMoney(total, decimalPlaces)}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Total</span>
          </>
        }
      />
      <ul className="flex min-w-[200px] flex-1 flex-col text-[13px] tabular-nums">
        {legend.map((r) => {
          const row = (
            <>
              <span aria-hidden="true" className={cn("size-2.5 flex-none", TONE_SWATCH[r.tone ?? "none"])} />
              <span className="flex-1 truncate">{r.name}</span>
              <span className="font-mono text-xs text-muted">{pct(r.share)}</span>
              <span className="w-24 text-right">
                <Money amount={r.amount} decimalPlaces={decimalPlaces} />
              </span>
            </>
          );
          const cls = "flex min-h-8 w-full items-center gap-2 border-b border-border px-1.5 text-left last:border-0";
          return (
            <li key={r.id} onMouseEnter={() => setActive(r.id)} onMouseLeave={() => setActive(null)}>
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
