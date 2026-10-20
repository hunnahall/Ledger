"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { compactMoney, shortMonthLabel } from "@/components/dashboard/format";
import { addDays, buildHeatmap, type DaySpent, type HeatCell, type HeatLevel } from "@/lib/charts/heatmap";
import { nextMonthISO } from "@/lib/dates";
import { ChartTitle } from "@/components/charts/chart-title";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

// Four steps of the signature color, lightest for the smallest quarter of
// spending days; days with nothing spent sit on the neutral track.
const LEVEL: Record<HeatLevel, string> = {
  0: "bg-fill-active",
  1: "bg-chart-1/25",
  2: "bg-chart-1/50",
  3: "bg-chart-1/75",
  4: "bg-chart-1",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CELL = "size-6 pointer-coarse:size-10";

// Money spent per day (the same rule as Outflows) across the selected months,
// through today. Weeks run as columns from Sunday; months in between that
// aren't selected stay blank.
// The grid is one tab stop: arrow keys move a day (up and down) or a week
// (left and right), Enter opens that day's transactions.
export function HeatmapCard({
  days,
  months,
  today,
  decimalPlaces,
}: {
  days: DaySpent[];
  /** The selected months, oldest first (YYYY-MM-01). */
  months: string[];
  /** Today, in the user's timezone: no square is drawn past it. */
  today: string;
  decimalPlaces: number;
}) {
  const from = months[0];
  const lastDay = addDays(nextMonthISO(months[months.length - 1]), -1);
  const to = lastDay < today ? lastDay : today;
  const { weeks, cells, thresholds } = useMemo(
    () => buildHeatmap(days, { from, to, include: (date) => months.includes(`${date.slice(0, 7)}-01`) }),
    [days, from, to, months],
  );
  const { openTile, modal } = useTilePopup(months, decimalPlaces);
  const [focused, setFocused] = useState(cells.length - 1);
  const [tip, setTip] = useState<{ cell: HeatCell; x: number; y: number } | null>(null);
  const idFor = (date: string) => `heat-${date}`;

  const open = (cell: HeatCell) => openTile(formatDate(cell.date), { type: "day", date: cell.date }, [`${cell.date.slice(0, 7)}-01`]);

  function showTip(cell: HeatCell, el: Element | null) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTip({ cell, x: r.left + r.width / 2, y: r.top });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
    let next = focused;
    if (e.key in step) next = focused + step[e.key];
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = cells.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (cells[focused]) open(cells[focused]);
      return;
    } else return;
    e.preventDefault();
    next = Math.min(cells.length - 1, Math.max(0, next));
    setFocused(next);
    const el = document.getElementById(idFor(cells[next].date));
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    showTip(cells[next], el);
  }

  // Month names over the week where each month starts.
  const monthStarts = weeks.map((col) => col.find((c) => c && c.date.endsWith("-01"))?.date ?? null);
  const nonzero = cells.filter((c) => c.spent > 0).length;
  const total = cells.reduce((sum, c) => sum + c.spent, 0);

  return (
    <section className="flex min-w-0 flex-col border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChartTitle>Spending by Day</ChartTitle>
        <span className="font-mono text-xs text-muted">
          {formatDate(from)} to {formatDate(to)}
        </span>
      </div>

      {nonzero === 0 ? (
        <p className="text-sm text-muted">No spending in this period yet.</p>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex w-max gap-2">
              <div aria-hidden="true" className="flex flex-col gap-1 pt-5 font-mono text-[11px] text-muted">
                {WEEKDAYS.map((d, i) => (
                  <span key={d} className={cn(CELL, "flex items-center", i % 2 === 0 && "invisible")}>
                    {d}
                  </span>
                ))}
              </div>
              <div>
                <div aria-hidden="true" className="flex h-5 gap-1 font-mono text-[11px] text-muted">
                  {monthStarts.map((date, i) => (
                    <span key={i} className={cn(CELL, "h-5 overflow-visible whitespace-nowrap pointer-coarse:h-5")}>
                      {date ? shortMonthLabel(`${date.slice(0, 7)}-01`) : ""}
                    </span>
                  ))}
                </div>
                <div
                  role="grid"
                  tabIndex={0}
                  aria-label={`Spending by day, ${formatDate(from)} to ${formatDate(to)}: ${formatMoney(total, decimalPlaces)} over ${nonzero} days with spending. Use the arrow keys to move between days and Enter to show a day's transactions.`}
                  aria-activedescendant={cells[focused] ? idFor(cells[focused].date) : undefined}
                  onKeyDown={onKeyDown}
                  onFocus={() => cells[focused] && showTip(cells[focused], document.getElementById(idFor(cells[focused].date)))}
                  onBlur={() => setTip(null)}
                  className="group flex flex-col gap-1 outline-none"
                >
                  {WEEKDAYS.map((name, wd) => (
                    <div key={name} role="row" className="flex gap-1">
                      {weeks.map((col, w) => {
                        const cell = col[wd];
                        if (!cell) return <span key={w} role="presentation" className={CELL} />;
                        const isFocused = cells[focused]?.date === cell.date;
                        return (
                          <div
                            key={w}
                            id={idFor(cell.date)}
                            role="gridcell"
                            aria-label={`${formatDate(cell.date)}: ${formatMoney(cell.spent, decimalPlaces)}`}
                            aria-selected={isFocused}
                            onClick={() => {
                              setFocused(cells.indexOf(cell));
                              open(cell);
                            }}
                            onMouseEnter={(e) => showTip(cell, e.currentTarget)}
                            onMouseLeave={() => setTip(null)}
                            className={cn(
                              CELL,
                              LEVEL[cell.level],
                              "cursor-pointer outline-offset-1 hover:outline hover:outline-1 hover:outline-foreground-secondary",
                              isFocused && "group-focus-visible:outline-2 group-focus-visible:outline-accent",
                            )}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5 text-xs text-foreground-secondary sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <LegendSwatch level={0}>None</LegendSwatch>
            <LegendSwatch level={1}>Up to {compactMoney(thresholds[0])}</LegendSwatch>
            <LegendSwatch level={2}>Up to {compactMoney(thresholds[1])}</LegendSwatch>
            <LegendSwatch level={3}>Up to {compactMoney(thresholds[2])}</LegendSwatch>
            <LegendSwatch level={4}>More than {compactMoney(thresholds[2])}</LegendSwatch>
          </div>
        </>
      )}

      {tip && (
        <div
          role="status"
          className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full border border-border-strong bg-surface-2 px-2.5 py-1.5 text-xs shadow-overlay"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          <p className="font-mono text-[11px] text-muted">{formatDate(tip.cell.date)}</p>
          <p className="tabular-nums">{formatMoney(tip.cell.spent, decimalPlaces)}</p>
        </div>
      )}
      {modal}
    </section>
  );
}

function LegendSwatch({ level, children }: { level: HeatLevel; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={cn("size-3", LEVEL[level])} />
      {children}
    </span>
  );
}
