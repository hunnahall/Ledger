"use client";

import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { shortMonthLabel } from "@/components/dashboard/format";
import { ChartTitle } from "@/components/charts/chart-title";
import { dailyFromCumulative, dailyPaceStatus } from "@/lib/dashboard-charts";
import type { MonthFigures } from "@/lib/queries/dashboard";

const SLOT = 10;
const BAR = 7;
/** Empty slots between two months. */
const MONTH_GAP = 2;
const H = 120;
// Days far above pace (rent, a big bill) would flatten every other bar, so
// the scale tops out at this multiple of the daily pace and taller days are
// drawn full height.
const CAP_MULTIPLE = 2.5;

const TONE = {
  below: "fill-accent",
  slightly_above: "fill-warning",
  well_above: "fill-danger",
} as const;

// Budget spending per day against each month's even daily pace (allocation
// / days), for the selected months side by side. Days above pace go yellow,
// well above (see WELL_ABOVE_PACE_MULTIPLE) red; days still to come show as
// an empty track.
export function DailySpendingCard({ months, decimalPlaces }: { months: MonthFigures[]; decimalPlaces: number }) {
  const { openTile, modal } = useTilePopup(
    months.map((m) => m.month),
    decimalPlaces,
  );

  // Each month's block: where it starts (in slots), its bars and its pace.
  const blocks = months.map((m, i) => ({
    ...m,
    start: months.slice(0, i).reduce((slots, prev) => slots + prev.daysInMonth + MONTH_GAP, 0),
    daily: dailyFromCumulative(m.expenseByDay),
    pacePerDay: m.allocation / m.daysInMonth,
  }));
  const last = blocks[blocks.length - 1];
  const width = (last.start + last.daysInMonth) * SLOT;
  const topPace = Math.max(0, ...blocks.map((b) => b.pacePerDay));
  const topDay = Math.max(0, ...blocks.flatMap((b) => b.daily));
  const maxY = Math.max(1, Math.min(Math.max(topPace, topDay) * 1.1, topPace > 0 ? topPace * CAP_MULTIPLE : Infinity));
  const y = (amount: number) => H - (Math.min(amount, maxY) / maxY) * H;
  const aboveCount = blocks.reduce(
    (n, b) => n + b.daily.filter((d) => dailyPaceStatus(d, b.pacePerDay) !== "below").length,
    0,
  );
  const dayCount = blocks.reduce((n, b) => n + b.daily.length, 0);
  const pct = (slot: number) => `${(slot * SLOT * 100) / width}%`;

  return (
    <section className="flex min-w-0 flex-[999_1_560px] flex-col border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChartTitle>Daily Spending</ChartTitle>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground-secondary">
          <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-muted" />
          Even pace
        </span>
      </div>
      <button
        type="button"
        onClick={() => openTile("Daily Spending", { type: "expense" })}
        className="block w-full flex-1"
        aria-label={`Daily spending for ${dayCount} days: ${aboveCount} above the even pace. Show transactions.`}
      >
        <svg viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none" className="block h-full min-h-36 w-full" aria-hidden="true">
          <line x1={0} x2={width} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
          {blocks.map((b) => (
            <g key={b.month}>
              {b.pacePerDay > 0 && (
                <line
                  x1={b.start * SLOT}
                  x2={(b.start + b.daysInMonth) * SLOT}
                  y1={y(b.pacePerDay)}
                  y2={y(b.pacePerDay)}
                  className="stroke-muted"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {b.daily.map((amount, i) => {
                const top = y(Math.max(amount, 0));
                return (
                  <rect
                    key={i}
                    x={(b.start + i) * SLOT + (SLOT - BAR) / 2}
                    y={top}
                    width={BAR}
                    height={H - top}
                    rx={1.5}
                    className={TONE[dailyPaceStatus(amount, b.pacePerDay)]}
                  />
                );
              })}
              {b.throughDay < b.daysInMonth && (
                <rect
                  x={(b.start + b.throughDay) * SLOT + (SLOT - BAR) / 2}
                  y={H - 3}
                  width={(b.daysInMonth - b.throughDay) * SLOT - (SLOT - BAR)}
                  height={3}
                  rx={1.5}
                  className="fill-border-strong"
                />
              )}
            </g>
          ))}
        </svg>
      </button>
      <div className="relative mt-2 h-4 text-[11px] tabular-nums text-muted">
        {blocks.map((b) => (
          <span key={b.month} className="absolute whitespace-nowrap" style={{ left: pct(b.start) }}>
            {shortMonthLabel(b.month)} 1
          </span>
        ))}
        <span className="absolute right-0 whitespace-nowrap">
          {shortMonthLabel(last.month)} {last.daysInMonth}
        </span>
      </div>
      {modal}
    </section>
  );
}
