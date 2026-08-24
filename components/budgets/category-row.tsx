"use client";

import { useActionState } from "react";
import { updateCategory, deleteCategory } from "@/lib/actions/categories";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";

type Category = {
  id: string;
  name: string;
  monthly_amount: number;
  spent: number;
  remaining: number;
  over: boolean;
  updated_at: string;
};

export function CategoryRow({
  category,
  budgetId,
  decimalPlaces,
  isLast,
  onAddClick,
}: {
  category: Category;
  budgetId: string;
  decimalPlaces: number;
  isLast: boolean;
  onAddClick: () => void;
}) {
  const [updateState, updateAction] = useActionState(
    updateCategory.bind(null, category.id, budgetId),
    null,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteCategory.bind(null, category.id, budgetId),
    null,
  );

  return (
    <tr className="border-b border-border last:border-0">
      <td colSpan={3} className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form action={updateAction} className="flex flex-wrap items-center gap-3">
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
            <Button type="submit" size="sm" tone="negative" formAction={deleteAction}>
              Delete
            </Button>
            {(updateState?.error || deleteState?.error) && (
              <p className="w-full text-xs text-negative">
                {updateState?.error || deleteState?.error}
              </p>
            )}
          </form>

          {isLast && (
            <Button
              type="button"
              variant="accent"
              size="icon"
              aria-label="Add category"
              onClick={onAddClick}
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
}
