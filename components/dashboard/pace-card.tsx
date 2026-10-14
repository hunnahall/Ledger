"use client";

import type { ReactNode } from "react";
import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { compactMoney, niceCeiling, shortMonthLabel } from "@/components/dashboard/format";
import { cn } from "@/lib/cn";

const W = 560;
const H = 160;

// Budget Net headline over the month's pace chart: cumulative Budget spend
// (getBudgetRateData's actualByDay) against an even pace to the allocation,
// with today marked while the month is running. No month-end projection:
// spending is too front-loaded (bills, transfers) for a straight line to mean anything.
export function PaceCard({
  budgetNet,
  totalAllocation,
  budgetedOutflow,
  daysInMonth,
  currentDay,
  actualByDay,
  monthISO,
  decimalPlaces,
}: {
  budgetNet: number;
  totalAllocation: number;
  budgetedOutflow: number;
  daysInMonth: number;
  currentDay: number;
  actualByDay: number[];
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);

  const spentSoFar = actualByDay[actualByDay.length - 1] ?? 0;
  const paceToday = (totalAllocation / daysInMonth) * currentDay;
  const underPace = paceToday - spentSoFar;
  const monthRunning = currentDay < daysInMonth;

  const maxY = niceCeiling(Math.max(totalAllocation, spentSoFar, 1));
  const x = (day: number) => (day / daysInMonth) * W;
  const y = (amount: number) => H - (amount / maxY) * H;
  const actual = [[0, H], ...actualByDay.map((v, i) => [x(i + 1), y(v)])];
  const actualPoints = actual.map(([px, py]) => `${round(px)},${round(py)}`).join(" ");
  const todayX = x(currentDay);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => f * maxY);
  const month = shortMonthLabel(monthISO);
  const dayTicks = [1, 8, 15, 22, daysInMonth];

  return (
    <>
      <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-lg border border-card-border bg-surface p-6 shadow-card">
        <div className="flex w-full flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-sm font-normal text-muted">Budget Net</h2>
            <button
              type="button"
              onClick={() => openTile("Budget Net", { type: "budget_net" })}
              className="-mx-1.5 mt-1 flex flex-col items-start rounded-md px-1.5 py-0.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <span
                className={cn(
                  "font-heading text-[44px] font-semibold leading-none tracking-tight",
                  budgetNet < 0 ? "text-negative" : "text-positive",
                )}
              >
                {budgetNet > 0 && "+"}
                <Money amount={budgetNet} decimalPlaces={decimalPlaces} />
              </span>
              <span className="mt-2 text-sm text-foreground-secondary">
                <Money amount={totalAllocation} decimalPlaces={decimalPlaces} /> allocated −{" "}
                <Money amount={budgetedOutflow} decimalPlaces={decimalPlaces} /> spent
              </span>
            </button>
          </div>
          {monthRunning && (
            <div className="flex flex-col gap-1 whitespace-nowrap text-xs text-muted">
              <span>Pace today</span>
              <span className={cn("text-lg font-semibold", underPace >= 0 ? "text-positive" : "text-negative")}>
                <Money amount={Math.abs(underPace)} decimalPlaces={decimalPlaces} /> {underPace >= 0 ? "under" : "over"}
              </span>
              <span>
                Even pace: <Money amount={paceToday} decimalPlaces={decimalPlaces} />
              </span>
            </div>
          )}
        </div>

        <div className="flex w-full gap-2.5">
          <div className="flex h-40 flex-col justify-between text-right text-[11px] tabular-nums text-paper-7">
            {ticks.map((t) => (
              <span key={t}>{compactMoney(t)}</span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="block h-40 w-full overflow-visible"
              role="img"
              aria-label={`Budget spending: ${compactMoney(spentSoFar)} by day ${currentDay} against an even pace of ${compactMoney(paceToday)}.`}
            >
              {monthRunning && (
                <rect x={todayX} y={0} width={W - todayX} height={H} className="fill-paper-3" fillOpacity={0.6} />
              )}
              {ticks.slice(0, -1).map((t) => (
                <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} className="stroke-paper-4" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={0} x2={W} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
              <line
                x1={0}
                y1={H}
                x2={W}
                y2={y(totalAllocation)}
                className="stroke-paper-7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
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
                    strokeWidth={2.5}
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
            </svg>
            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-paper-7">
              {dayTicks.map((d) => (
                <span key={d}>
                  {month} {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-xs text-foreground-secondary">
          <LegendLine className="h-[3px] rounded-sm bg-accent">Budget spending</LegendLine>
          <LegendLine className="border-t-2 border-dashed border-paper-7">Even pace</LegendLine>
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

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
