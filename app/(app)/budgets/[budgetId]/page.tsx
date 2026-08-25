import { notFound } from "next/navigation";
import { getBudgetWithCategories } from "@/lib/queries/budgets";
import { getSourceOptions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { CategoriesTable } from "@/components/budgets/categories-table";
import { SinkingExpensesTable } from "@/components/budgets/sinking-expenses-table";
import { SourceTransfersTable } from "@/components/budgets/source-transfers-table";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;
  const [{ budget, categories, sinkingExpenses, sourceTransfers }, settings, sourceOptions] =
    await Promise.all([
      getBudgetWithCategories(budgetId),
      getSettings(),
      getSourceOptions(),
    ]);
  const decimalPlaces = settings.decimal_places;

  if (!budget) notFound();

  const categoriesMonthly = categories.reduce((sum, c) => sum + c.monthly_amount, 0);
  const sinkingMonthly = sinkingExpenses.reduce((sum, s) => sum + s.monthly_amount, 0);
  const sourceTransfersMonthly = sourceTransfers.reduce((sum, s) => sum + s.amount, 0);
  const totalMonthly = categoriesMonthly + sinkingMonthly + sourceTransfersMonthly;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{budget.name}</h1>

        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-sm text-muted">Your transactions&apos; categories.</p>
          <p className="text-sm text-muted">
            {categories.length} categories &middot; {sinkingExpenses.length} sinking expenses
            &middot; {sourceTransfers.length} source transfers &middot; $
            {totalMonthly.toFixed(2)}/month allocated
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight">Monthly Expenses</h2>
          <CategoriesTable categories={categories} budgetId={budgetId} decimalPlaces={decimalPlaces} />
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight">Sinking Expenses</h2>
          <SinkingExpensesTable
            sinkingExpenses={sinkingExpenses}
            budgetId={budgetId}
            decimalPlaces={decimalPlaces}
          />

          <h2 className="text-lg font-semibold tracking-tight">Source Transfers</h2>
          <SourceTransfersTable
            sourceTransfers={sourceTransfers}
            budgetId={budgetId}
            sourceOptions={sourceOptions}
            decimalPlaces={decimalPlaces}
          />
        </section>
      </div>
    </div>
  );
}
