import Link from "next/link";
import { notFound } from "next/navigation";
import { getBudgetWithCategories } from "@/lib/queries/budgets";
import {
  archiveCategory,
  createCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { renameBudget } from "@/lib/actions/budgets";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;
  const { budget, categories } = await getBudgetWithCategories(budgetId);

  if (!budget) notFound();

  const totalMonthly = categories.reduce((sum, c) => sum + c.monthly_amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/budgets" className="text-sm text-muted hover:underline">
          &larr; Budgets
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{budget.name}</h1>
          {budget.is_current && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-surface">
              Current
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          {categories.length} categories &middot; ${totalMonthly.toFixed(2)}/month allocated
        </p>
      </div>

      <form
        action={renameBudget.bind(null, budgetId)}
        className="flex max-w-sm items-end gap-2"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Budget name
          <input
            type="text"
            name="name"
            defaultValue={budget.name}
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
        >
          Rename
        </button>
      </form>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
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
                    <button
                      type="submit"
                      className="rounded-md border border-border px-3 py-1.5 hover:bg-background"
                    >
                      Save
                    </button>
                    <button
                      type="submit"
                      formAction={archiveCategory.bind(null, category.id, budgetId)}
                      className="rounded-md border border-border px-3 py-1.5 text-negative hover:bg-background"
                    >
                      Archive
                    </button>
                  </form>
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

      <form
        action={createCategory.bind(null, budgetId)}
        className="flex max-w-lg flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
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
        <button
          type="submit"
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
        >
          Add category
        </button>
      </form>
    </div>
  );
}
