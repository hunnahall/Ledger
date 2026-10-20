"use client";

import { useState } from "react";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { shortMonthLabel } from "@/components/dashboard/format";
import { TREND_MODES, trendPair, type TrendMode, type TrendMonth } from "@/lib/dashboard-charts";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import type { DashboardTileKind } from "@/lib/actions/dashboard-transactions";
import { cn } from "@/lib/cn";

// What each bar of each comparison opens. The allocation bar is a commitment,
// not money that moved, so it has no transactions to show.
const KINDS: Record<TrendMode, [DashboardTileKind | null, DashboardTileKind | null]> = {
  income_expenses: [{ type: "income" }, { type: "expense" }],
  inflows_outflows: [{ type: "inflows" }, { type: "outflows" }],
  budget_spending: [null, { type: "expense" }],
};

const COLORS: Record<TrendMode, [string, string]> = {
  income_expenses: ["bg-accent", "bg-foreground/45"],
  inflows_outflows: ["bg-accent", "bg-foreground/45"],
  budget_spending: ["bg-foreground/25", "bg-accent"],
};

// Two bars per month for the last 4 months, in one of three comparisons. The
// current month is drawn lighter since it's still in progress.
export function LastMonthsCard({
  months,
  currentMonthISO,
  decimalPlaces,
}: {
  months: TrendMonth[];
  currentMonthISO: string;
  decimalPlaces: number;
}) {
  const [mode, setMode] = useState<TrendMode>("income_expenses");
  const { openTile, modal } = useTilePopup(currentMonthISO, decimalPlaces);
  const meta = TREND_MODES.find((m) => m.value === mode)!;
  const [colorA, colorB] = COLORS[mode];
  const pairs = months.map((m) => ({ month: m.month, values: trendPair(m, mode) }));
  const max = Math.max(1, ...pairs.flatMap((p) => p.values)) * 1.05;
  const label = (month: string) => `${shortMonthLabel(month)}${month === currentMonthISO ? " so far" : ""}`;

  return (
    <section className="flex flex-1 flex-col border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="whitespace-nowrap text-base font-semibold">Last 4 Months</h2>
        <Select uiSize="sm" className="w-44" value={mode} onChange={(v) => setMode(v as TrendMode)}>
          {TREND_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-2.5 flex gap-4 text-xs text-foreground-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5", colorA)} />
          {meta.a}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5", colorB)} />
          {meta.b}
        </span>
      </div>

      <div
        role="img"
        aria-label={`${meta.a} versus ${meta.b} by month: ${pairs
          .map((p) => `${label(p.month)} ${Math.round(p.values[0])} and ${Math.round(p.values[1])}`)
          .join("; ")}`}
        className="grid min-h-28 flex-1 grid-cols-4 border-b border-border-strong"
      >
        {pairs.map((p) => (
          <div
            key={p.month}
            className={cn("flex items-end justify-center gap-1", p.month === currentMonthISO && "opacity-55")}
          >
            {p.values.map((v, i) => {
              const kind = KINDS[mode][i];
              const name = i === 0 ? meta.a : meta.b;
              const bar = (
                <div className={cn("w-6", i === 0 ? colorA : colorB)} style={{ height: "100%" }} />
              );
              return (
                <div key={i} className="flex h-full items-end" style={{ height: "100%" }}>
                  {kind ? (
                    <button
                      type="button"
                      aria-label={`${name}, ${label(p.month)}. Show transactions.`}
                      onClick={() => openTile(`${name}, ${label(p.month)}`, kind, p.month)}
                      className="flex items-end hover:opacity-80"
                      style={{ height: `${(v / max) * 100}%` }}
                    >
                      {bar}
                    </button>
                  ) : (
                    <div className="flex items-end" style={{ height: `${(v / max) * 100}%` }}>
                      {bar}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 text-center text-xs tabular-nums">
        {pairs.map((p) => {
          const net = p.values[0] - p.values[1];
          return (
            <span key={p.month}>
              <span className="block whitespace-nowrap text-muted">{label(p.month)}</span>
              <span className={cn("font-semibold", net < 0 && "text-negative")}>
                {net > 0 && "+"}
                <Money amount={net} decimalPlaces={decimalPlaces} />
              </span>
            </span>
          );
        })}
      </div>
      {modal}
    </section>
  );
}
