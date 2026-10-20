"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { shortMonthLabel } from "@/components/dashboard/format";
import { ChartTitle } from "@/components/charts/chart-title";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format";
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
  slightly_above: "fill-chart-caution",
  well_above: "fill-danger",
} as const;

const STATUS_LABEL = {
  below: "At or below pace",
  slightly_above: "Above pace",
  well_above: "Well above pace",
} as const;

type Day = { date: string; slot: number; amount: number; pace: number };

// Budget spending per day against each month's even daily pace (allocation
// / days), for the selected months side by side. Days above pace are a soft
// gold, well above (see WELL_ABOVE_PACE_MULTIPLE) red; days still to come
// show as an empty track. Hovering a day (or moving with the arrow keys)
// shows its date, amount and pace; clicking it, or Enter, opens that day's
// transactions.
export function DailySpendingCard({ months, decimalPlaces }: { months: MonthFigures[]; decimalPlaces: number }) {
  const { openTile, modal } = useTilePopup(
    months.map((m) => m.month),
    decimalPlaces,
  );
  const [hovered, setHovered] = useState<number | null>(null);

  // Each month's block: where it starts (in slots), its bars and its pace.
  const blocks = months.map((m, i) => ({
    ...m,
    start: months.slice(0, i).reduce((slots, prev) => slots + prev.daysInMonth + MONTH_GAP, 0),
    daily: dailyFromCumulative(m.expenseByDay),
    pacePerDay: m.allocation / m.daysInMonth,
  }));
  const last = blocks[blocks.length - 1];
  const totalSlots = last.start + last.daysInMonth;
  const width = totalSlots * SLOT;
  // Every day that has happened, in order: what hover and the keys move over.
  const days: Day[] = blocks.flatMap((b) =>
    b.daily.map((amount, i) => ({
      date: `${b.month.slice(0, 8)}${String(i + 1).padStart(2, "0")}`,
      slot: b.start + i,
      amount,
      pace: b.pacePerDay,
    })),
  );

  const topPace = Math.max(0, ...blocks.map((b) => b.pacePerDay));
  const topDay = Math.max(0, ...days.map((d) => d.amount));
  const maxY = Math.max(1, Math.min(Math.max(topPace, topDay) * 1.1, topPace > 0 ? topPace * CAP_MULTIPLE : Infinity));
  const y = (amount: number) => H - (Math.min(amount, maxY) / maxY) * H;
  const aboveCount = days.filter((d) => dailyPaceStatus(d.amount, d.pace) !== "below").length;
  const pct = (slot: number) => `${(slot * SLOT * 100) / width}%`;
  const active = hovered !== null ? days[hovered] : null;

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const slot = Math.floor(((e.clientX - box.left) / box.width) * totalSlots);
    const index = days.findIndex((d) => d.slot === slot);
    setHovered(index === -1 ? null : index);
  }

  function openDay(day: Day) {
    openTile(formatDate(day.date), { type: "expense_day", date: day.date });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (days.length === 0) return;
    const current = hovered ?? days.length - 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setHovered(Math.min(days.length - 1, Math.max(0, current + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setHovered(e.key === "Home" ? 0 : days.length - 1);
    } else if ((e.key === "Enter" || e.key === " ") && hovered !== null) {
      e.preventDefault();
      openDay(days[hovered]);
    }
  }

  return (
    <section className="flex min-w-0 flex-[999_1_560px] flex-col border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChartTitle>Daily Spending</ChartTitle>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground-secondary">
          <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-muted" />
          Even pace
        </span>
      </div>
      <div
        role="group"
        tabIndex={0}
        aria-label={`Daily spending for ${days.length} days, ${aboveCount} above the even pace. Use the left and right arrow keys to move between days and Enter to show a day's transactions.`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
        onBlur={() => setHovered(null)}
        onFocus={() => setHovered((h) => h ?? (days.length > 0 ? days.length - 1 : null))}
        onKeyDown={onKeyDown}
        onClick={() => active && openDay(active)}
        className="relative block w-full flex-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ cursor: active ? "pointer" : "default" }}
      >
        {active && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-36 border border-border-strong bg-surface-2 px-2.5 py-1.5 text-xs shadow-overlay"
            style={
              active.slot / totalSlots > 0.6
                ? { right: `calc(${100 - ((active.slot + 1) * 100) / totalSlots}% + 6px)` }
                : { left: `calc(${pct(active.slot + 1)} + 6px)` }
            }
          >
            <p className="font-mono text-[11px] text-muted">{formatDate(active.date)}</p>
            <p className="tabular-nums">
              <Money amount={active.amount} decimalPlaces={decimalPlaces} /> spent
            </p>
            <p className="text-muted tabular-nums">
              {STATUS_LABEL[dailyPaceStatus(active.amount, active.pace)]} (
              <Money amount={active.pace} decimalPlaces={decimalPlaces} /> a day)
            </p>
          </div>
        )}
        <svg viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none" className="block h-full min-h-36 w-full" aria-hidden="true">
          {active && (
            <rect x={active.slot * SLOT} y={0} width={SLOT} height={H} className="fill-fill-hover" />
          )}
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
                    opacity={active && active.slot !== b.start + i ? 0.55 : 1}
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
      </div>
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
