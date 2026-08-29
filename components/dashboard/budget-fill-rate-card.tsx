import { Card } from "@/components/ui/card";
import { BudgetRateChart } from "@/components/budgets/budget-rate-chart";

// Compact pairing of Budget Fill (a single stat) and Budget Rate (a small
// pace chart) into one card, sized to fit the same slot the Dashboard's old
// Account balances card used — a short chart height keeps the combined
// block no taller than that was.
export function BudgetFillRateCard({
  budgetFillPct,
  totalAllocation,
  daysInMonth,
  currentDay,
  actualByDay,
}: {
  budgetFillPct: number | null;
  totalAllocation: number;
  daysInMonth: number;
  currentDay: number;
  actualByDay: number[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-medium">Budget Fill</p>
        <p className="text-lg font-semibold">{budgetFillPct === null ? "—" : `${budgetFillPct}%`}</p>
      </div>
      <div className="mt-4">
        <p className="mb-1 text-xs text-muted">Budget Rate</p>
        <BudgetRateChart
          totalAllocation={totalAllocation}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
          actualByDay={actualByDay}
          height={90}
        />
      </div>
    </Card>
  );
}
