"use client";

import { useState } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/categories";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { AddIcon, ChevronDownIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";

type SortDirection = "desc" | "asc" | null;

type Category = {
  id: string;
  name: string;
  monthly_amount: number;
  spent: number;
  remaining: number;
  over: boolean;
  updated_at: string;
};

export function CategoriesTable({
  categories,
  budgetId,
  decimalPlaces,
}: {
  categories: Category[];
  budgetId: string;
  decimalPlaces: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Cycle none -> high-to-low -> low-to-high -> none, same three-state
  // pattern as a typical spreadsheet column header.
  function cycleSortDirection() {
    setSortDirection((prev) => (prev === null ? "desc" : prev === "desc" ? "asc" : null));
  }

  const sortedCategories =
    sortDirection === null
      ? categories
      : [...categories].sort((a, b) =>
          sortDirection === "desc"
            ? b.monthly_amount - a.monthly_amount
            : a.monthly_amount - b.monthly_amount,
        );

  return (
    <div className="rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">
              <button
                type="button"
                onClick={cycleSortDirection}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label={
                  sortDirection === "desc"
                    ? "Sorted high to low, click for low to high"
                    : sortDirection === "asc"
                      ? "Sorted low to high, click to clear sort"
                      : "Sort by monthly amount"
                }
              >
                Monthly amount
                <ChevronDownIcon
                  size={12}
                  className={sortDirection === "asc" ? "rotate-180" : sortDirection === null ? "opacity-30" : ""}
                />
              </button>
            </th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sortedCategories.map((category, index) => {
            const isLast = !showAdd && index === categories.length - 1;
            return (
              <tr key={category.id} className="border-b border-border last:border-0">
                <td colSpan={3} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <form
                      action={updateCategory.bind(null, category.id, budgetId)}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <input
                        key={`name-${category.updated_at}`}
                        type="text"
                        name="name"
                        defaultValue={category.name}
                        required
                        className="w-40 rounded-md border border-border bg-background px-3 py-1.5"
                      />
                      <input
                        key={`amount-${category.updated_at}`}
                        type="number"
                        name="monthly_amount"
                        step="0.01"
                        min="0"
                        onKeyDown={stepAmountByDollar}
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

                    {isLast && (
                      <Button
                        type="button"
                        variant="accent"
                        size="icon"
                        aria-label="Add category"
                        onClick={() => setShowAdd(true)}
                      >
                        <AddIcon />
                      </Button>
                    )}
                  </div>
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
            );
          })}

          {categories.length === 0 && !showAdd && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center">
                <Button
                  type="button"
                  variant="accent"
                  size="icon"
                  aria-label="Add category"
                  onClick={() => setShowAdd(true)}
                >
                  <AddIcon />
                </Button>
              </td>
            </tr>
          )}

          {showAdd && (
            <tr className="border-b border-border bg-surface-subtle last:border-0">
              <td colSpan={3} className="px-4 py-3">
                <form
                  action={createCategory.bind(null, budgetId)}
                  onSubmit={() => setShowAdd(false)}
                  className="flex flex-wrap items-end gap-3"
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
                      onKeyDown={stepAmountByDollar}
                      defaultValue={0}
                      className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <Button type="submit" variant="accent" size="sm">
                    Add
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="pb-2 text-xs text-muted hover:underline"
                  >
                    Cancel
                  </button>
                </form>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
