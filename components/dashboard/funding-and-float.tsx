"use client";

import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { cn } from "@/lib/cn";

const R = 56;
const C = 2 * Math.PI * R;

// How much of the budget this month's income has covered so far. With Month
// Ahead on, this month's income funds next month, so it's measured against
// next month's allocation; with it off, against this month's.
export function BudgetFundingCard({
  income,
  totalAllocation,
  fundsNextMonth,
  monthISO,
  decimalPlaces,
}: {
  income: number;
  totalAllocation: number;
  fundsNextMonth: boolean;
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);
  const ratio = totalAllocation > 0 ? income / totalAllocation : null;
  const filled = ratio === null ? 0 : Math.min(ratio, 1);

  return (
    <section className="rounded-lg border border-card-border bg-surface px-6 py-5 shadow-card">
      <h2 className="mb-3.5 whitespace-nowrap text-base font-semibold">Budget Funding</h2>
      <div className="flex items-center gap-6">
        <svg
          width={100}
          height={100}
          viewBox="0 0 140 140"
          className="flex-none"
          role="img"
          aria-label={ratio === null ? "No budget allocation" : `${Math.round(ratio * 100)}% of the budget allocation funded`}
        >
          <circle cx={70} cy={70} r={R} fill="none" strokeWidth={16} className="stroke-paper-3" />
          {filled > 0 && (
            <circle
              cx={70}
              cy={70}
              r={R}
              fill="none"
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={`${filled * C} ${C}`}
              transform="rotate(-90 70 70)"
              className="stroke-positive"
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
            className="-mx-1.5 rounded-md px-1.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <span className="block text-xs text-muted">Income received</span>
            <span className="text-lg font-semibold text-positive">
              <Money amount={income} decimalPlaces={decimalPlaces} />
            </span>
          </button>
          <div>
            <span className="block text-xs text-muted">
              {fundsNextMonth ? "Next month's allocation" : "Budget allocation"}
            </span>
            <span className="text-lg font-semibold">
              <Money amount={totalAllocation} decimalPlaces={decimalPlaces} />
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
  monthISO,
  decimalPlaces,
}: {
  balance: number;
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);
  return (
    <>
      <button
        type="button"
        onClick={() => openTile("Float", { type: "float" })}
        className="rounded-lg border border-card-border bg-surface px-6 py-4 text-left shadow-card transition-colors duration-[120ms] ease-standard hover:bg-paper-a1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <span className="block text-sm text-muted">Float</span>
        <span className={cn("mt-0.5 block font-heading text-2xl font-semibold", balance < 0 && "text-negative")}>
          <Money amount={balance} decimalPlaces={decimalPlaces} />
        </span>
      </button>
      {modal}
    </>
  );
}
