import { notFound } from "next/navigation";
import { getBudgetData } from "@/lib/queries/budgets";
import { getSourceOptions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { currentDayOfMonth, currentMonthISO, daysInMonthISO, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { categoryLines } from "@/lib/budget/category-status";
import { Stat, StatRow } from "@/components/ui/stat";
import { BudgetCharts } from "@/components/budget/budget-charts";
import { CategoriesTable } from "@/components/budget/categories-table";
import { SinkingExpensesTable } from "@/components/budget/sinking-expenses-table";
import { SourceTransfersTable } from "@/components/budget/source-transfers-table";

export default async function BudgetPage() {
  const settings = await getSettings();
  const monthISO = currentMonthISO(settings.timezone);
  const [data, sourceOptions] = await Promise.all([getBudgetData(), getSourceOptions()]);
  const decimalPlaces = settings.decimal_places;

  if (!data) notFound();
  const { categories, sinkingExpenses, sourceTransfers } = data;

  const sinkingMonthly = sinkingExpenses.reduce((sum, s) => sum + s.monthly_amount, 0);
  const sourceTransfersMonthly = sourceTransfers.reduce((sum, s) => sum + s.amount, 0);
  // With the Transfers category carrying the sinking plus source transfer
  // total as its budget, the Budget column (and so `totals.budget`) is the
  // whole allocation.
  const { lines, totals, over } = categoryLines(categories, sinkingMonthly + sourceTransfersMonthly);
  const daysLeft = daysInMonthISO(monthISO) - currentDayOfMonth(settings.timezone);
  const money = (n: number) => formatMoney(n, decimalPlaces);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Budget</h1>
        <p className="mt-1 text-sm text-muted">
          {monthLabel(monthISO)} &middot; {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
        </p>
      </div>

      <StatRow>
        <Stat label="Allocated" value={money(totals.budget)} caption="per month" />
        <Stat label="Spent" value={money(totals.spent)} caption={`${lines.length} categories`} />
        <Stat
          label="Left"
          value={money(totals.left)}
          tone={totals.left < 0 ? "danger" : undefined}
          caption={daysLeft > 0 ? `${money(Math.max(totals.left, 0) / daysLeft)} a day` : undefined}
        />
        <Stat
          label="Over"
          value={over.length}
          tone={over.length > 0 ? "danger" : undefined}
          caption={over.length > 0 ? over.map((l) => l.name).join(", ") : "None"}
        />
      </StatRow>

      <BudgetCharts
        categories={lines.map((l) => {
          const category = categories.find((c) => c.id === l.id)!;
          return { id: l.id, name: l.name, monthlyAmount: category.monthly_amount, budget: l.budget, spent: l.spent };
        })}
        sinkingExpensesTotal={sinkingMonthly}
        sourceTransfersTotal={sourceTransfersMonthly}
        monthISO={monthISO}
        decimalPlaces={decimalPlaces}
      />

      <CategoriesTable categories={categories} lines={lines} totals={totals} decimalPlaces={decimalPlaces} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SinkingExpensesTable sinkingExpenses={sinkingExpenses} decimalPlaces={decimalPlaces} />
        <SourceTransfersTable
          sourceTransfers={sourceTransfers}
          sourceOptions={sourceOptions}
          decimalPlaces={decimalPlaces}
        />
      </div>
    </div>
  );
}
