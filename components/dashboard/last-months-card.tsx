"use client";

import { useState } from "react";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { shortMonthLabel } from "@/components/dashboard/format";
import { TREND_MODES, trendPair, type TrendMode, type TrendMonth } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";

const COLORS: Record<TrendMode, [string, string]> = {
  income_expenses: ["bg-positive", "bg-negative"],
  inflows_outflows: ["bg-positive", "bg-negative"],
  budget_spending: ["bg-chart-3", "bg-accent"],
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
  const meta = TREND_MODES.find((m) => m.value === mode)!;
  const [colorA, colorB] = COLORS[mode];
  const pairs = months.map((m) => ({ month: m.month, values: trendPair(m, mode) }));
  const max = Math.max(1, ...pairs.flatMap((p) => p.values)) * 1.05;
  const label = (month: string) => `${shortMonthLabel(month)}${month === currentMonthISO ? " so far" : ""}`;

  return (
    <section className="flex flex-1 flex-col rounded-lg border border-card-border bg-surface px-6 py-5 shadow-card">
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
          <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", colorA)} />
          {meta.a}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", colorB)} />
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
            {p.values.map((v, i) => (
              <div
                key={i}
                className={cn("w-6 rounded-t-[3px]", i === 0 ? colorA : colorB)}
                style={{ height: `${(v / max) * 100}%` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 text-center text-xs tabular-nums">
        {pairs.map((p) => {
          const net = p.values[0] - p.values[1];
          return (
            <span key={p.month}>
              <span className="block whitespace-nowrap text-muted">{label(p.month)}</span>
              <span className={cn("font-semibold", net < 0 ? "text-negative" : "text-positive")}>
                {net > 0 && "+"}
                <Money amount={net} decimalPlaces={decimalPlaces} />
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
