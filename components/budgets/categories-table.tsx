"use client";

import { useActionState, useState } from "react";
import { createCategory } from "@/lib/actions/categories";
import { CategoryRow } from "@/components/budgets/category-row";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Button } from "@/components/ui/button";
import { SortableHeader, useSortDirection } from "@/components/ui/sortable-header";
import { TableShell, TableEmptyRow } from "@/components/ui/table-shell";
import { Input } from "@/components/ui/input";

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
  decimalPlaces,
}: {
  categories: Category[];
  decimalPlaces: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [, createAction] = useActionState(createCategory, null);
  const {
    sorted: sortedCategories,
    direction: sortDirection,
    cycle: cycleSortDirection,
  } = useSortDirection(categories, (c) => c.monthly_amount);

  const sortHeader = (
    <SortableHeader label="Monthly amount" direction={sortDirection} onClick={cycleSortDirection} />
  );

  return (
    <TableShell columns={["Category", sortHeader, ""]}>
      {sortedCategories.map((category, index) => (
        <CategoryRow
          key={category.id}
          category={category}
          decimalPlaces={decimalPlaces}
          isLast={!showAdd && index === categories.length - 1}
          onAddClick={() => setShowAdd(true)}
        />
      ))}

      {categories.length === 0 && !showAdd && (
        <TableEmptyRow colSpan={3} label="Add category" onClick={() => setShowAdd(true)} />
      )}

      {showAdd && (
        <tr className="border-b border-border bg-surface-subtle last:border-0">
          <td colSpan={3} className="px-4 py-3">
            <form
              action={createAction}
              onSubmit={() => setShowAdd(false)}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                New category
                <Input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Groceries"
                  className="w-40"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Monthly amount
                <Input
                  type="number"
                  name="monthly_amount"
                  step="0.01"
                  min="0"
                  onKeyDown={stepAmountByDollar}
                  defaultValue={0}
                  className="w-28"
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
    </TableShell>
  );
}
