import Link from "next/link";
import { getBudgets } from "@/lib/queries/budgets";
import { createBudget, deleteBudget, setCurrentBudget } from "@/lib/actions/budgets";

export default async function BudgetsPage() {
  const budgets = await getBudgets();
  const atLimit = budgets.length >= 10;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-muted">
            {budgets.length} / 10 budgets. Exactly one is your current budget.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => (
          <div
            key={budget.id}
            className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/budgets/${budget.id}`}
                  className="font-medium hover:underline"
                >
                  {budget.name}
                </Link>
                {budget.is_current && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-surface">
                    Current
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/budgets/${budget.id}`}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
              >
                Categories
              </Link>
              {!budget.is_current && (
                <form action={setCurrentBudget.bind(null, budget.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
                  >
                    Set current
                  </button>
                </form>
              )}
              {!budget.is_current && (
                <form action={deleteBudget.bind(null, budget.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-negative hover:bg-background"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      {!atLimit && (
        <form
          action={createBudget}
          className="flex max-w-sm items-end gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm"
        >
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
          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
          >
            Create
          </button>
        </form>
      )}
    </div>
  );
}
