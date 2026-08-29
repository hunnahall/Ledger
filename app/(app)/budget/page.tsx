import { notFound } from "next/navigation";
import { getBudgetData, getBudgetRateData } from "@/lib/queries/budgets";
import { getSourceOptions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { CategoriesTable } from "@/components/budgets/categories-table";
import { SinkingExpensesTable } from "@/components/budgets/sinking-expenses-table";
import { SourceTransfersTable } from "@/components/budgets/source-transfers-table";
import { BudgetRateChart } from "@/components/budgets/budget-rate-chart";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

export default async function BudgetsPage() {
  const [data, settings, sourceOptions, rateData] = await Promise.all([
    getBudgetData(),
    getSettings(),
    getSourceOptions(),
    getBudgetRateData(),
  ]);
  const decimalPlaces = settings.decimal_places;

  if (!data) notFound();
  const { categories, sinkingExpenses, sourceTransfers } = data;

  const categoriesMonthly = categories.reduce((sum, c) => sum + c.monthly_amount, 0);
  const sinkingMonthly = sinkingExpenses.reduce((sum, s) => sum + s.monthly_amount, 0);
  const sourceTransfersMonthly = sourceTransfers.reduce((sum, s) => sum + s.amount, 0);
  const totalMonthly = categoriesMonthly + sinkingMonthly + sourceTransfersMonthly;

  const budgetFillPct =
    categoriesMonthly > 0 && rateData ? Math.round((rateData.income / categoriesMonthly) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>

        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-sm text-muted">Your transactions&apos; categories.</p>
          <p className="text-sm text-muted">
            {categories.length} categories &middot; {sinkingExpenses.length} sinking expenses
            &middot; {sourceTransfers.length} source transfers &middot; $
            {totalMonthly.toFixed(2)}/month allocated
          </p>
        </div>
      </div>

      {rateData && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs text-muted">Budget Fill</p>
            <p className="mt-1 text-xl font-semibold">
              {budgetFillPct === null ? "—" : `${budgetFillPct}%`}
            </p>
            <p className="mt-1 text-xs text-muted">
              <Money amount={rateData.income} decimalPlaces={decimalPlaces} /> earned of{" "}
              <Money amount={categoriesMonthly} decimalPlaces={decimalPlaces} /> budgeted
            </p>
          </Card>

          <Card className="p-5 sm:col-span-2">
            <p className="mb-3 text-xs text-muted">
              Budget Rate &middot; spending pace vs. actual (day {rateData.currentDay} of{" "}
              {rateData.daysInMonth})
            </p>
            <BudgetRateChart
              categoriesTotal={categoriesMonthly}
              daysInMonth={rateData.daysInMonth}
              currentDay={rateData.currentDay}
              actualByDay={rateData.actualByDay}
            />
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight">Categories</h2>
          <CategoriesTable categories={categories} decimalPlaces={decimalPlaces} />
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight">Sinking Expenses</h2>
          <SinkingExpensesTable
            sinkingExpenses={sinkingExpenses}
            decimalPlaces={decimalPlaces}
          />

          <h2 className="text-lg font-semibold tracking-tight">Source Transfers</h2>
          <SourceTransfersTable
            sourceTransfers={sourceTransfers}
            sourceOptions={sourceOptions}
            decimalPlaces={decimalPlaces}
          />
        </section>
      </div>
    </div>
  );
}
