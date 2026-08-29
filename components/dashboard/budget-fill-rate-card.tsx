import { Card } from "@/components/ui/card";
import { BudgetRateChart } from "@/components/budgets/budget-rate-chart";

// Two separate tiles (Budget Fill, Budget Rate) stacked in a flex column
// that fills its grid cell — CSS grid stretches that cell to the row's
// height (set by the taller Spending By Category tile next to it), and the
// flex-1 children split that height evenly, so the two tiles plus the gap
// between them always add up to exactly Spending By Category's height.
export function BudgetFillRateTiles({
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
    <div className="flex flex-col gap-4">
      <Card className="flex-1 p-5">
        <p className="text-xs text-muted">Budget Fill</p>
        <p className="mt-1 text-xl font-semibold">
          {budgetFillPct === null ? "—" : `${budgetFillPct}%`}
        </p>
      </Card>

      <Card className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted">Budget Rate</p>
        <div className="mt-1 min-h-0 flex-1">
          <BudgetRateChart
            totalAllocation={totalAllocation}
            daysInMonth={daysInMonth}
            currentDay={currentDay}
            actualByDay={actualByDay}
          />
        </div>
      </Card>
    </div>
  );
}
