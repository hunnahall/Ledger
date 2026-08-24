import { notFound } from "next/navigation";
import { getBudgetWithCategories, getBudgets } from "@/lib/queries/budgets";
import { getSourceOptions } from "@/lib/queries/sources";
import { deleteBudget } from "@/lib/actions/budgets";
import { getSettings } from "@/lib/queries/settings";
import { BudgetSwitcher } from "@/components/budgets/budget-switcher";
import { BudgetRenameControl } from "@/components/budgets/budget-rename-control";
import { CreateBudgetForm } from "@/components/budgets/create-budget-form";
import { CategoriesTable } from "@/components/budgets/categories-table";
import { SinkingExpensesTable } from "@/components/budgets/sinking-expenses-table";
import { SourceTransfersTable } from "@/components/budgets/source-transfers-table";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { AddIcon } from "@/components/ui/icons";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;
  const [{ budget, categories, sinkingExpenses, sourceTransfers }, allBudgets, settings, sourceOptions] =
    await Promise.all([
      getBudgetWithCategories(budgetId),
      getBudgets(),
      getSettings(),
      getSourceOptions(),
    ]);
  const decimalPlaces = settings.decimal_places;

  if (!budget) notFound();

  const categoriesMonthly = categories.reduce((sum, c) => sum + c.monthly_amount, 0);
  const sinkingMonthly = sinkingExpenses.reduce((sum, s) => sum + s.monthly_amount, 0);
  const sourceTransfersMonthly = sourceTransfers.reduce((sum, s) => sum + s.amount, 0);
  const totalMonthly = categoriesMonthly + sinkingMonthly + sourceTransfersMonthly;
  const atLimit = allBudgets.length >= 3;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <BudgetSwitcher
            budgets={allBudgets.map((b) => ({ id: b.id, name: b.name }))}
            selectedId={budgetId}
          />
          <BudgetRenameControl budgetId={budgetId} name={budget.name} />
          <ActionButtonForm action={deleteBudget.bind(null, budgetId)} size="sm" tone="negative">
            Delete
          </ActionButtonForm>
          {!atLimit && (
            <details className="relative">
              <summary
                aria-label="New budget"
                className="flex cursor-pointer list-none items-center justify-center rounded-md bg-mark p-2 text-mark-foreground transition-all duration-150 hover:-translate-y-0.5 hover:shadow-elevated hover:brightness-95 active:translate-y-0 active:scale-[0.98]"
              >
                <AddIcon />
              </summary>
              <CreateBudgetForm className="absolute left-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-lg border border-card-border bg-surface p-4 shadow-elevated" />
            </details>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{budget.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {categories.length} categories &middot; {sinkingExpenses.length} sinking expenses
          &middot; {sourceTransfers.length} source transfers &middot; ${totalMonthly.toFixed(2)}/month
          allocated
        </p>
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
