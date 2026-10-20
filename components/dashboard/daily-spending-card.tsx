"use client";

import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { shortMonthLabel } from "@/components/dashboard/format";
import { dailyFromCumulative, dailyPaceStatus } from "@/lib/dashboard-charts";

const SLOT = 10;
const BAR = 7;
const H = 120;
// Days far above pace (rent, a big bill) would flatten every other bar, so
// the scale tops out at this multiple of the daily pace and taller days are
// drawn full height.
const CAP_MULTIPLE = 2.5;

const TONE = {
  below: "fill-accent",
  slightly_above: "fill-warning",
  well_above: "fill-negative",
} as const;

// Budget spending per day against the even daily pace (allocation / days).
// Days above pace go yellow, well above (see WELL_ABOVE_PACE_MULTIPLE) red;
// days still to come show as an empty track.
export function DailySpendingCard({
  actualByDay,
  allocation,
  daysInMonth,
  currentDay,
  monthISO,
  decimalPlaces,
}: {
  actualByDay: number[];
  allocation: number;
  daysInMonth: number;
  currentDay: number;
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);

  const daily = dailyFromCumulative(actualByDay);
  const pacePerDay = allocation / daysInMonth;
  const maxY = Math.max(
    1,
    Math.min(Math.max(pacePerDay, ...daily) * 1.1, pacePerDay > 0 ? pacePerDay * CAP_MULTIPLE : Infinity),
  );
  const y = (amount: number) => H - (Math.min(amount, maxY) / maxY) * H;
  const width = daysInMonth * SLOT;
  const aboveCount = daily.filter((d) => dailyPaceStatus(d, pacePerDay) !== "below").length;
  const month = shortMonthLabel(monthISO);

  return (
    <section className="flex min-w-0 flex-[999_1_560px] flex-col border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Daily Spending</h2>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground-secondary">
          <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-muted" />
          Even pace
        </span>
      </div>
      <button
        type="button"
        onClick={() => openTile("Daily Spending", { type: "expense" })}
        className="block w-full flex-1 rounded-md"
        aria-label={`Daily spending for ${currentDay} days: ${aboveCount} above the even pace. Show transactions.`}
      >
        <svg viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none" className="block h-full min-h-36 w-full" aria-hidden="true">
          {pacePerDay > 0 && (
            <line
              x1={0}
              x2={width}
              y1={y(pacePerDay)}
              y2={y(pacePerDay)}
              className="stroke-muted"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <line x1={0} x2={width} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
          {daily.map((amount, i) => {
            const top = y(Math.max(amount, 0));
            return (
              <rect
                key={i}
                x={i * SLOT + (SLOT - BAR) / 2}
                y={top}
                width={BAR}
                height={H - top}
                rx={1.5}
                className={TONE[dailyPaceStatus(amount, pacePerDay)]}
              />
            );
          })}
          {currentDay < daysInMonth && (
            <rect
              x={currentDay * SLOT + (SLOT - BAR) / 2}
              y={H - 3}
              width={(daysInMonth - currentDay) * SLOT - (SLOT - BAR)}
              height={3}
              rx={1.5}
              className="fill-border-strong"
            />
          )}
        </svg>
      </button>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-muted">
        <span>{month} 1</span>
        {currentDay < daysInMonth && (
          <span>
            {month} {currentDay}
          </span>
        )}
        <span>
          {month} {daysInMonth}
        </span>
      </div>
      {modal}
    </section>
  );
}
