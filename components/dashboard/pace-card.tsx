"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { compactMoney, niceCeiling, shortMonthLabel } from "@/components/dashboard/format";
import { cn } from "@/lib/cn";
import { cumulativeLinePoints, paceChartPeak, valueOnDay, type PaceLine } from "@/lib/charts/pace";

const W = 560;
const H = 160;

// Budget Net headline over the month's pace chart: cumulative Budget spend
// (getBudgetRateData's actualByDay) against an even pace to the allocation,
// with today marked while the month is running. No month-end projection:
// spending is too front-loaded (bills, transfers) for a straight line to mean anything.
// Up to three earlier months (getPaceHistory) sit behind it in faint ink so
// this month can be read against them; hovering lists every line's value.
export function PaceCard({
  budgetNet,
  allocation,
  expense,
  daysInMonth,
  currentDay,
  actualByDay,
  earlier,
  monthISO,
  decimalPlaces,
}: {
  budgetNet: number;
  allocation: number;
  expense: number;
  daysInMonth: number;
  currentDay: number;
  actualByDay: number[];
  /** Earlier months, newest first; months without data are already left out. */
  earlier: PaceLine[];
  monthISO: string;
  decimalPlaces: number;
}) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);

  const spentSoFar = actualByDay[actualByDay.length - 1] ?? 0;
  const paceToday = (allocation / daysInMonth) * currentDay;
  const underPace = paceToday - spentSoFar;
  const monthRunning = currentDay < daysInMonth;

  const maxY = niceCeiling(paceChartPeak({ allocation, current: actualByDay, earlier, daysInMonth }));
  const x = (day: number) => (day / daysInMonth) * W;
  const y = (amount: number) => H - (amount / maxY) * H;
  const lineBox = { daysInMonth, maxY, width: W, height: H };
  const actualPoints = cumulativeLinePoints(actualByDay, lineBox);
  // Earlier months are compared on the same day of the month as today.
  const compareDay = Math.max(currentDay, 1);
  const earlierLabel = (l: PaceLine) => shortMonthLabel(l.month);

  function onPointerMove(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const day = Math.round(((e.clientX - box.left) / box.width) * daysInMonth);
    setHoverDay(Math.min(daysInMonth, Math.max(1, day)));
  }
  const todayX = x(currentDay);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => f * maxY);
  const month = shortMonthLabel(monthISO);
  const dayTicks = [1, 8, 15, 22, daysInMonth];

  return (
    <>
      <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 border border-border bg-surface p-5">
        <div className="flex w-full flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Budget Net</h2>
            <button
              type="button"
              onClick={() => openTile("Budget Net", { type: "budget_net" })}
              className="-mx-1.5 mt-1 flex flex-col items-start px-1.5 py-0.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
            >
              <span
                className={cn(
                  "font-sans text-[44px] font-semibold leading-none tracking-[-0.025em]",
                  budgetNet < 0 && "text-danger",
                )}
              >
                {budgetNet > 0 && "+"}
                <Money amount={budgetNet} decimalPlaces={decimalPlaces} />
              </span>
              <span className="mt-2 text-sm text-foreground-secondary tabular-nums">
                <Money amount={allocation} decimalPlaces={decimalPlaces} /> allocated −{" "}
                <Money amount={expense} decimalPlaces={decimalPlaces} /> spent
              </span>
            </button>
          </div>
          {monthRunning && (
            <div className="flex flex-col gap-1 whitespace-nowrap text-xs text-muted">
              <span>Pace today</span>
              <span className={cn("text-lg font-semibold", underPace < 0 && "text-danger")}>
                <Money amount={Math.abs(underPace)} decimalPlaces={decimalPlaces} /> {underPace >= 0 ? "under" : "over"}
              </span>
              <span>
                Even pace: <Money amount={paceToday} decimalPlaces={decimalPlaces} />
              </span>
            </div>
          )}
        </div>

        <div className="flex w-full gap-2.5">
          <div className="flex h-40 flex-col justify-between text-right text-[11px] tabular-nums text-muted">
            {ticks.map((t) => (
              <span key={t}>{compactMoney(t)}</span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            {hoverDay !== null && (
              <PaceTooltip
                day={hoverDay}
                daysInMonth={daysInMonth}
                month={month}
                rows={[
                  ...(hoverDay <= actualByDay.length
                    ? [{ key: "current", label: "This month", value: valueOnDay(actualByDay, hoverDay), current: true }]
                    : []),
                  ...earlier.map((l) => ({
                    key: l.month,
                    label: earlierLabel(l),
                    value: valueOnDay(l.byDay, hoverDay),
                    current: false,
                  })),
                  { key: "pace", label: "Even pace", value: (allocation / daysInMonth) * hoverDay, current: false },
                ]}
                decimalPlaces={decimalPlaces}
              />
            )}
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block h-40 w-full overflow-visible"
              role="img"
              aria-label={`Budget spending: ${compactMoney(spentSoFar)} by day ${currentDay} against an even pace of ${compactMoney(paceToday)}.${earlier
                .map((l) => ` ${earlierLabel(l)}: ${compactMoney(valueOnDay(l.byDay, compareDay))} by day ${compareDay}.`)
                .join("")}`}
            >
              {monthRunning && (
                <rect x={todayX} y={0} width={W - todayX} height={H} className="fill-fill-active" fillOpacity={0.6} />
              )}
              {ticks.slice(0, -1).map((t) => (
                <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} className="stroke-border" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={0} x2={W} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
              <line
                x1={0}
                y1={H}
                x2={W}
                y2={y(allocation)}
                className="stroke-foreground-secondary"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
              {earlier.map((l) => (
                <polyline
                  key={l.month}
                  points={cumulativeLinePoints(l.byDay, lineBox)}
                  fill="none"
                  className="stroke-foreground"
                  strokeOpacity={0.22}
                  strokeWidth={1.5}
                  strokeLinejoin="miter"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {actualByDay.length > 0 && (
                <>
                  <polygon
                    points={`${actualPoints} ${round(todayX)},${H}`}
                    className="fill-accent"
                    fillOpacity={0.12}
                  />
                  <polyline
                    points={actualPoints}
                    fill="none"
                    className="stroke-accent"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
              {monthRunning && (
                <line
                  x1={todayX}
                  x2={todayX}
                  y1={0}
                  y2={H}
                  className="stroke-accent"
                  strokeOpacity={0.4}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {hoverDay !== null && (
                <line
                  x1={x(hoverDay)}
                  x2={x(hoverDay)}
                  y1={0}
                  y2={H}
                  className="stroke-foreground-secondary"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <rect
                x={0}
                y={0}
                width={W}
                height={H}
                fill="transparent"
                onPointerMove={onPointerMove}
                onPointerLeave={() => setHoverDay(null)}
              />
            </svg>
            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-muted">
              {dayTicks.map((d) => (
                <span key={d}>
                  {month} {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-xs text-foreground-secondary">
          <LegendLine className="h-[1.5px] bg-accent">Budget spending</LegendLine>
          <LegendLine className="border-t border-dashed border-foreground-secondary">Even pace</LegendLine>
          {earlier.map((l) => (
            <LegendLine key={l.month} className="h-[1.5px] bg-foreground/22">
              {earlierLabel(l)}{" "}
              <span className="tabular-nums text-muted">
                <Money amount={valueOnDay(l.byDay, compareDay)} decimalPlaces={decimalPlaces} /> by day {compareDay}
              </span>
            </LegendLine>
          ))}
        </div>
      </section>
      {modal}
    </>
  );
}

function LegendLine({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={cn("w-4", className)} />
      {children}
    </span>
  );
}

function PaceTooltip({
  day,
  daysInMonth,
  month,
  rows,
  decimalPlaces,
}: {
  day: number;
  daysInMonth: number;
  month: string;
  rows: { key: string; label: string; value: number; current: boolean }[];
  decimalPlaces: number;
}) {
  const share = day / daysInMonth;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 min-w-40 border border-border-strong bg-surface-2 px-2.5 py-2 text-xs shadow-overlay"
      style={share > 0.6 ? { right: `${(1 - share) * 100}%`, marginRight: 8 } : { left: `${share * 100}%`, marginLeft: 8 }}
    >
      <p className="mb-1 font-mono text-[11px] text-muted">
        {month} {day}
      </p>
      {rows.map((r) => (
        <p key={r.key} className="flex items-center justify-between gap-4 tabular-nums">
          <span className={r.current ? "text-foreground" : "text-foreground-secondary"}>{r.label}</span>
          <Money amount={r.value} decimalPlaces={decimalPlaces} />
        </p>
      ))}
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
