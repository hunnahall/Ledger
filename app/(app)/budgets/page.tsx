import { redirect } from "next/navigation";
import { getBudgets } from "@/lib/queries/budgets";
import { resolveDefaultBudgetId } from "@/lib/budgets/resolve-default";
import { CreateBudgetForm } from "@/components/budgets/create-budget-form";
import { Card } from "@/components/ui/card";

export default async function BudgetsPage() {
  const budgets = await getBudgets();
  const defaultBudgetId = resolveDefaultBudgetId(budgets);

  if (defaultBudgetId) {
    redirect(`/budgets/${defaultBudgetId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="mt-1 text-sm text-muted">Create your first budget to get started.</p>
      </div>

      <Card className="flex max-w-sm items-end gap-2">
        <CreateBudgetForm className="contents" />
      </Card>
    </div>
  );
}
