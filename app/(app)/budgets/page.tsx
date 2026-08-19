import { redirect } from "next/navigation";
import { getBudgets } from "@/lib/queries/budgets";
import { createBudget } from "@/lib/actions/budgets";
import { resolveDefaultBudgetId } from "@/lib/budgets/resolve-default";
import { Button } from "@/components/ui/button";
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
        <form action={createBudget} className="contents">
          <label className="flex flex-1 flex-col gap-1 text-sm">
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
      </Card>
    </div>
  );
}
