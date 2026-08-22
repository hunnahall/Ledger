import { notFound } from "next/navigation";
import { getBudgetWithCategories, getBudgets } from "@/lib/queries/budgets";
import {
  deleteCategory,
  createCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { createBudget, deleteBudget } from "@/lib/actions/budgets";
import { getSettings } from "@/lib/queries/settings";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BudgetSwitcher } from "@/components/budgets/budget-switcher";
import { BudgetRenameControl } from "@/components/budgets/budget-rename-control";
import { SinkingExpenseRow } from "@/components/budgets/sinking-expense-row";
import { SinkingExpenseForm } from "@/components/budgets/sinking-expense-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;
  const [{ budget, categories, sinkingExpenses }, allBudgets, settings] = await Promise.all([
    getBudgetWithCategories(budgetId),
    getBudgets(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;

  if (!budget) notFound();

  const categoriesMonthly = categories.reduce((sum, c) => sum + c.monthly_amount, 0);
  const sinkingMonthly = sinkingExpenses.reduce((sum, s) => sum + s.monthly_amount, 0);
  const totalMonthly = categoriesMonthly + sinkingMonthly;
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
          <form action={deleteBudget.bind(null, budgetId)}>
            <Button type="submit" size="sm" tone="negative">
              Delete
            </Button>
          </form>
          {!atLimit && (
            <details className="relative">
              <summary
                aria-label="New budget"
                className="flex cursor-pointer list-none items-center justify-center rounded-md bg-mark p-2 text-mark-foreground transition-all duration-150 hover:-translate-y-0.5 hover:shadow-elevated hover:brightness-95 active:translate-y-0 active:scale-[0.98]"
              >
                <AddIcon />
              </summary>
              <form
                action={createBudget}
                className="absolute left-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-lg border border-card-border bg-surface p-4 shadow-elevated"
              >
                <label className="flex flex-col gap-1 text-sm">
                  New budget name
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Normal, Cut food / splurge rent"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <Button type="submit" variant="primary">
                  Create
                </Button>
              </form>
            </details>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{budget.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {categories.length} categories &middot; {sinkingExpenses.length} sinking expenses
          &middot; ${totalMonthly.toFixed(2)}/month allocated
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight">Monthly Expenses</h2>
          <div className="rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Monthly amount</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={`${category.id}-${category.updated_at}`}
                    className="border-b border-border last:border-0"
                  >
                    <td colSpan={3} className="px-4 py-3">
                      <form
                        action={updateCategory.bind(null, category.id, budgetId)}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <input
                          type="text"
                          name="name"
                          defaultValue={category.name}
                          required
                          className="w-40 rounded-md border border-border bg-background px-3 py-1.5"
                        />
                        <input
                          type="number"
                          name="monthly_amount"
                          step="0.01"
                          min="0"
                          defaultValue={category.monthly_amount}
                          className="w-28 rounded-md border border-border bg-background px-3 py-1.5"
                        />
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          tone="negative"
                          formAction={deleteCategory.bind(null, category.id, budgetId)}
                        >
                          Delete
                        </Button>
                      </form>
                      <div className="mt-2 max-w-sm">
                        <div className="flex justify-between text-xs">
                          <span className={category.over ? "text-negative" : "text-muted"}>
                            <Money amount={category.spent} decimalPlaces={decimalPlaces} /> spent
                          </span>
                          <span className="text-muted">
                            <Money amount={category.remaining} decimalPlaces={decimalPlaces} /> remaining
                          </span>
                        </div>
                        <div className="mt-1">
                          <ProgressBar total={category.monthly_amount} spent={category.spent} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Card className="flex flex-wrap items-end gap-3">
            <form action={createCategory.bind(null, budgetId)} className="contents">
              <label className="flex flex-col gap-1 text-sm">
                New category
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Groceries"
                  className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Monthly amount
                <input
                  type="number"
                  name="monthly_amount"
                  step="0.01"
                  min="0"
                  defaultValue={0}
                  className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <Button type="submit" variant="accent">
                Add category
              </Button>
            </form>
          </Card>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight">Sinking Expenses</h2>
          <div className="rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Sinking expense</th>
                  <th className="px-4 py-3 font-medium">Monthly</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sinkingExpenses.map((expense) => (
                  <SinkingExpenseRow
                    key={`${expense.id}-${expense.updated_at}`}
                    expense={expense}
                    budgetId={budgetId}
                    decimalPlaces={decimalPlaces}
                  />
                ))}
                {sinkingExpenses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted">
                      No sinking expenses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Card className="flex flex-wrap items-end gap-3">
            <SinkingExpenseForm budgetId={budgetId} />
          </Card>
        </section>
      </div>
    </div>
  );
}
