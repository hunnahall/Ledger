"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AreaChart } from "@/components/charts/area-chart";
import { ChartTitle } from "@/components/charts/chart-title";
import { useSetSearchParams } from "@/components/transactions/column-filter";
import { formatDate, formatMoney } from "@/lib/format";
import type { DaySpending } from "@/lib/transactions/spending-by-day";

/** Fewest days the slider can show, and where it starts. */
const MIN_DAYS = 7;
const DEFAULT_DAYS = 30;

// Spending per day, ending on the latest day with spending. The slider sets
// how many days back it reaches, up to everything Ledger keeps. Clicking a
// day filters the list below to that day; clicking it again clears the
// filter.
export function SpendingByDayChart({
  days,
  decimalPlaces,
}: {
  days: DaySpending[];
  decimalPlaces: number;
}) {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const [span, setSpan] = useState(DEFAULT_DAYS);
  const from = searchParams.get("date_from");
  const to = searchParams.get("date_to");
  const selected = from && from === to ? from : null;

  if (days.length < 2) return null;
  const max = days.length;
  const min = Math.min(MIN_DAYS, max);
  const count = Math.min(Math.max(span, min), max);
  const shown = days.slice(-count);
  const total = shown.reduce((sum, d) => sum + d.amount, 0);

  return (
    <section className="border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ChartTitle>Spending by Day</ChartTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2.5 font-mono text-xs text-muted">
            <span className="w-24 whitespace-nowrap tabular-nums">Last {count} days</span>
            <input
              type="range"
              min={min}
              max={max}
              value={count}
              onChange={(e) => setSpan(Number(e.target.value))}
              aria-label="Days shown"
              aria-valuetext={`Last ${count} days`}
              className="h-1 w-36 cursor-pointer accent-[var(--accent)] pointer-coarse:w-48"
            />
          </label>
          <span className="font-mono text-xs text-muted tabular-nums">{formatMoney(total, decimalPlaces)} spent</span>
        </div>
      </div>
      <AreaChart
        data={shown.map((d) => ({ key: d.date, label: formatDate(d.date), value: d.amount }))}
        formatValue={(v) => formatMoney(v, decimalPlaces)}
        ariaLabel={`Spending per day from ${formatDate(shown[0].date)} to ${formatDate(shown[shown.length - 1].date)}, ${formatMoney(total, decimalPlaces)} in total.`}
        selectedKey={selected}
        height={120}
        onSelect={(date) => setParams(selected === date ? { date_from: null, date_to: null } : { date_from: date, date_to: date })}
      />
    </section>
  );
}
