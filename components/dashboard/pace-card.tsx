"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { Money } from "@/components/ui/money";
import { ChartTitle } from "@/components/charts/chart-title";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { compactMoney, niceCeiling, shortMonthLabel } from "@/components/dashboard/format";
import { cn } from "@/lib/cn";
import { cumulativeLinePoints, paceChartPeak, valueOnDay } from "@/lib/charts/pace";
import type { MonthFigures } from "@/lib/queries/dashboard";

const W = 560;
const H = 160;

// Budget Net headline over the pace chart: each selected month's cumulative
// Budget spend by day of the month. The newest selected month is the Umber
// line, with an even pace to its allocation and today marked while it's
// running; any other selected months sit behind it in faint ink. No
// month-end projection: spending is too front-loaded (bills, transfers) for
// a straight line to mean anything. Hovering lists every line's value.
export function PaceCard({
  budgetNet,
  allocation,
  expense,
  months,
  decimalPlaces,
}: {
  /** Added up over the selected months. */
  budgetNet: number;
  allocation: number;
  expense: number;
  /** The selected months, oldest first. */
  months: MonthFigures[];
  decimalPlaces: number;
}) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const { openTile, modal } = useTilePopup(
    months.map((m) => m.month),
    decimalPlaces,
  );

  const main = months[months.length - 1];
  const others = months.slice(0, -1).reverse();
  const daysInMonth = Math.max(...months.map((m) => m.daysInMonth));
  const mainSpent = main.expenseByDay[main.expenseByDay.length - 1] ?? 0;
  const pacePerDay = main.allocation / main.daysInMonth;
  const paceToday = pacePerDay * main.throughDay;
  const underPace = paceToday - mainSpent;
  const running = main.throughDay < main.daysInMonth;
  // "Pace today" only reads clearly for a single month in progress.
  const showPaceToday = months.length === 1 && running;

  const maxY = niceCeiling(
    paceChartPeak({ allocation: main.allocation, lines: months.map((m) => m.expenseByDay), daysInMonth }),
  );
  const x = (day: number) => (day / daysInMonth) * W;
  const y = (amount: number) => H - (amount / maxY) * H;
  const lineBox = { daysInMonth, maxY, width: W, height: H };
  const mainPoints = cumulativeLinePoints(main.expenseByDay, lineBox);
  const compareDay = Math.max(main.throughDay, 1);
  const label = (m: MonthFigures) => shortMonthLabel(m.month);

  function onPointerMove(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const day = Math.round(((e.clientX - box.left) / box.width) * daysInMonth);
    setHoverDay(Math.min(daysInMonth, Math.max(1, day)));
  }
  const todayX = x(main.throughDay);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => f * maxY);
  const dayTicks = [1, 8, 15, 22, daysInMonth];
  const axisMonth = months.length === 1 ? `${label(main)} ` : "Day ";

  return (
    <>
      <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 border border-border bg-surface p-5">
        <div className="flex w-full flex-wrap items-start justify-between gap-6">
          <div>
            <ChartTitle>Budget Net</ChartTitle>
            <button
              type="button"
              // The list is the spending (and category income) behind the figure.
              // Allocation isn't a transaction, so its total isn't Budget Net itself.
              onClick={() => openTile("Budget Spending and Category Income", { type: "budget_net" })}
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
          {showPaceToday && (
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
                heading={`${axisMonth}${hoverDay}`}
                rows={[
                  ...(hoverDay <= main.expenseByDay.length
                    ? [{ key: main.month, label: label(main), value: valueOnDay(main.expenseByDay, hoverDay), current: true }]
                    : []),
                  ...others
                    .filter((m) => hoverDay <= m.expenseByDay.length)
                    .map((m) => ({ key: m.month, label: label(m), value: valueOnDay(m.expenseByDay, hoverDay), current: false })),
                  { key: "pace", label: `Even pace (${label(main)})`, value: pacePerDay * hoverDay, current: false },
                ]}
                decimalPlaces={decimalPlaces}
              />
            )}
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block h-40 w-full overflow-visible"
              role="img"
              aria-label={`Budget spending in ${label(main)}: ${compactMoney(mainSpent)} by day ${main.throughDay} against an even pace of ${compactMoney(paceToday)}.${others
                .map((m) => ` ${label(m)}: ${compactMoney(valueOnDay(m.expenseByDay, compareDay))} by day ${compareDay}.`)
                .join("")}`}
            >
              {running && (
                <rect x={todayX} y={0} width={W - todayX} height={H} className="fill-fill-active" fillOpacity={0.6} />
              )}
              {ticks.slice(0, -1).map((t) => (
                <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} className="stroke-border" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={0} x2={W} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
              <line
                x1={0}
                y1={H}
                x2={x(main.daysInMonth)}
                y2={y(main.allocation)}
                className="stroke-foreground-secondary"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
              {others.map((m) => (
                <polyline
                  key={m.month}
                  points={cumulativeLinePoints(m.expenseByDay, lineBox)}
                  fill="none"
                  className="stroke-foreground"
                  strokeOpacity={0.22}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {main.expenseByDay.length > 0 && (
                <>
                  <polygon
                    points={`${mainPoints} ${round(x(main.expenseByDay.length))},${H}`}
                    className="fill-accent"
                    fillOpacity={0.12}
                  />
                  <polyline
                    points={mainPoints}
                    fill="none"
                    className="stroke-accent"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
              {running && (
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
                  {axisMonth}
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-xs text-foreground-secondary">
          <LegendLine className="h-[1.5px] bg-accent">
            {months.length === 1 ? "Budget spending" : `${label(main)} spending`}
          </LegendLine>
          <LegendLine className="border-t border-dashed border-foreground-secondary">Even pace</LegendLine>
          {others.map((m) => (
            <LegendLine key={m.month} className="h-[1.5px] bg-foreground/22">
              {label(m)}{" "}
              <span className="tabular-nums text-muted">
                <Money amount={valueOnDay(m.expenseByDay, compareDay)} decimalPlaces={decimalPlaces} /> by day {compareDay}
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
  heading,
  rows,
  decimalPlaces,
}: {
  day: number;
  daysInMonth: number;
  heading: string;
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
        {heading}
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
