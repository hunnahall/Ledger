"use client";

import { useSearchParams } from "next/navigation";
import { AreaChart } from "@/components/charts/area-chart";
import { useSetSearchParams } from "@/components/transactions/column-filter";
import { formatDate, formatMoney } from "@/lib/format";
import type { DaySpending } from "@/lib/transactions/spending-by-day";

// Spending per day across the listed transactions. Clicking a day filters the
// list below to that day; clicking it again clears the filter.
export function SpendingByDayChart({
  days,
  decimalPlaces,
}: {
  days: DaySpending[];
  decimalPlaces: number;
}) {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const from = searchParams.get("date_from");
  const to = searchParams.get("date_to");
  const selected = from && from === to ? from : null;

  if (days.length < 2) return null;
  const total = days.reduce((sum, d) => sum + d.amount, 0);

  return (
    <section className="border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2>Spending by Day</h2>
        <span className="font-mono text-xs text-muted">{formatMoney(total, decimalPlaces)} spent</span>
      </div>
      <AreaChart
        data={days.map((d) => ({ key: d.date, label: formatDate(d.date), value: d.amount }))}
        formatValue={(v) => formatMoney(v, decimalPlaces)}
        ariaLabel={`Spending per day from ${formatDate(days[0].date)} to ${formatDate(days[days.length - 1].date)}, ${formatMoney(total, decimalPlaces)} in total.`}
        selectedKey={selected}
        onSelect={(date) => setParams(selected === date ? { date_from: null, date_to: null } : { date_from: date, date_to: date })}
      />
    </section>
  );
}
