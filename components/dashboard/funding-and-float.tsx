"use client";

import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { RING, arcDash } from "@/lib/charts/donut";
import { ChartTitle } from "@/components/charts/chart-title";

const C = RING.size / 2;

// How much of the budget this month's income has covered so far. With Month
// Ahead on, this month's income funds next month, so it's measured against
// next month's allocation; with it off, against this month's.
export function BudgetFundingCard({
  income,
  allocation,
  fundsNextMonth,
  months,
  decimalPlaces,
}: {
  income: number;
  allocation: number;
  fundsNextMonth: boolean;
  months: string[];
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(months, decimalPlaces);
  const ratio = allocation > 0 ? income / allocation : null;
  const filled = ratio === null ? 0 : Math.min(ratio, 1);

  return (
    <section className="border border-border bg-surface p-5">
      <ChartTitle className="mb-3.5">Budget Funding</ChartTitle>
      <div className="flex items-center gap-6">
        <svg
          width={100}
          height={100}
          viewBox={`0 0 ${RING.size} ${RING.size}`}
          className="flex-none"
          role="img"
          aria-label={ratio === null ? "No budget allocation" : `${Math.round(ratio * 100)}% of the budget allocation funded`}
        >
          <circle cx={C} cy={C} r={RING.radius} fill="none" strokeWidth={RING.stroke} className="stroke-fill-active" />
          {filled > 0 && (
            <circle
              cx={C}
              cy={C}
              r={RING.radius}
              fill="none"
              pathLength={100}
              strokeWidth={RING.stroke}
              {...arcDash({ offset: 0, length: filled * 100 })}
              transform={`rotate(-90 ${C} ${C})`}
              className="stroke-accent"
            />
          )}
          <text x={70} y={72} textAnchor="middle" className="fill-foreground font-heading text-[28px] font-semibold">
            {ratio === null ? "—" : `${Math.round(ratio * 100)}%`}
          </text>
          <text x={70} y={90} textAnchor="middle" className="fill-muted text-[11px]">
            funded
          </text>
        </svg>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 text-sm tabular-nums">
          <button
            type="button"
            onClick={() => openTile("Income", { type: "income" })}
            className="-mx-1.5 px-1.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
          >
            <span className="block text-xs text-muted">Income received</span>
            <span className="text-lg font-semibold">
              <Money amount={income} decimalPlaces={decimalPlaces} />
            </span>
          </button>
          <div>
            <span className="block text-xs text-muted">
              {fundsNextMonth
                ? months.length === 1
                  ? "Next month's allocation"
                  : "Each following month's allocation"
                : "Budget allocation"}
            </span>
            <span className="text-lg font-semibold">
              <Money amount={allocation} decimalPlaces={decimalPlaces} />
            </span>
          </div>
        </div>
      </div>
      {modal}
    </section>
  );
}

// Float's running balance, figure only.
export function FloatCard({
  balance,
  months,
  decimalPlaces,
}: {
  balance: number;
  months: string[];
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(months, decimalPlaces);
  return (
    <>
      <button
        type="button"
        onClick={() => openTile("Float", { type: "float" })}
        className="border border-border bg-surface p-5 text-left transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
      >
        <ChartTitle>Float</ChartTitle>
        <span className="mt-1 block text-[28px] font-semibold leading-tight">
          <Money amount={balance} decimalPlaces={decimalPlaces} />
        </span>
      </button>
      {modal}
    </>
  );
}
