import { notFound } from "next/navigation";
import { getBudgetData } from "@/lib/queries/budgets";
import { getSourceOptions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { getCategorySpending } from "@/lib/queries/budgets";
import { currentMonthISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { BudgetCharts } from "@/components/budgets/budget-charts";
import { CategoriesTable } from "@/components/budgets/categories-table";
import { SinkingExpensesTable } from "@/components/budgets/sinking-expenses-table";
import { SourceTransfersTable } from "@/components/budgets/source-transfers-table";

export default async function BudgetsPage() {
  const settings = await getSettings();
  const monthISO = currentMonthISO(settings.timezone);
  const [data, sourceOptions, spendingByCategory] = await Promise.all([
    getBudgetData(),
    getSourceOptions(),
    getCategorySpending(monthISO),
  ]);
  const decimalPlaces = settings.decimal_places;

  if (!data) notFound();
  const { categories, sinkingExpenses, sourceTransfers } = data;

  const categoriesMonthly = categories.reduce((sum, c) => sum + c.monthly_amount, 0);
  const sinkingMonthly = sinkingExpenses.reduce((sum, s) => sum + s.monthly_amount, 0);
  const sourceTransfersMonthly = sourceTransfers.reduce((sum, s) => sum + s.amount, 0);
  const totalMonthly = categoriesMonthly + sinkingMonthly + sourceTransfersMonthly;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Budget</h1>

        <p className="mt-1 text-sm text-muted">
          {categories.length} categories &middot; {sinkingExpenses.length} sinking expenses
          &middot; {sourceTransfers.length} source transfers &middot; {formatMoney(totalMonthly)} allocated
          per month
        </p>
      </div>

      <BudgetCharts
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          monthlyAmount: c.monthly_amount,
          spent: spendingByCategory.get(c.id) ?? 0,
        }))}
        sinkingExpensesTotal={sinkingMonthly}
        sourceTransfersTotal={sourceTransfersMonthly}
        monthISO={monthISO}
        decimalPlaces={decimalPlaces}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <h2>Categories</h2>
          <CategoriesTable categories={categories} decimalPlaces={decimalPlaces} />
        </section>

        <section className="flex flex-col gap-6">
          <h2 id="block:sinking-expenses">Sinking Expenses</h2>
          <SinkingExpensesTable
            sinkingExpenses={sinkingExpenses}
            decimalPlaces={decimalPlaces}
          />

          <h2 id="block:source-transfers">Source Transfers</h2>
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
