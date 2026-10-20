"use client";

import { updateCategory, deleteCategory } from "@/lib/actions/categories";
import { stepAmountByDollar } from "@/lib/dollar-step";
import {
  CATEGORY_STATUS_LABELS,
  type CategoryLine,
  type CategoryStatus,
} from "@/lib/budget/category-status";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Input } from "@/components/ui/input";
import { ExpandableRow } from "@/components/budget/expandable-row";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<CategoryStatus, "neutral" | "success" | "warning" | "danger"> = {
  on_track: "success",
  near_limit: "warning",
  spent: "neutral",
  over: "danger",
};

export type EditableCategory = {
  id: string;
  name: string;
  monthly_amount: number;
  updated_at: string;
};

export function CategoryRow({
  category,
  line,
  decimalPlaces,
}: {
  category: EditableCategory;
  line: CategoryLine;
  decimalPlaces: number;
}) {
  return (
    <ExpandableRow
      colSpan={7}
      expandLabel={`Edit ${category.name}`}
      collapseLabel="Collapse details"
      updateAction={updateCategory.bind(null, category.id)}
      deleteAction={deleteCategory.bind(null, category.id)}
      compactCells={
        <>
          <td className="px-4 font-medium">{line.name}</td>
          <td
            className="px-4 text-right"
            title={line.isTransfers ? "Sinking expenses plus Source transfers" : undefined}
          >
            <Money amount={line.budget} decimalPlaces={decimalPlaces} symbol={false} />
          </td>
          <td className="px-4 text-right">
            <Money amount={line.spent} decimalPlaces={decimalPlaces} symbol={false} />
          </td>
          <td className={cn("px-4 text-right", line.status === "over" && "text-danger")}>
            <Money amount={line.left} decimalPlaces={decimalPlaces} symbol={false} />
          </td>
          <td className="w-32 px-4">
            <ProgressBar total={line.budget} spent={line.spent} />
          </td>
          <td className="px-4">
            <Badge tone={STATUS_TONE[line.status]} className="whitespace-nowrap">
              {CATEGORY_STATUS_LABELS[line.status]}
            </Badge>
          </td>
        </>
      }
    >
      <Input
        key={`name-${category.updated_at}`}
        type="text"
        name="name"
        defaultValue={category.name}
        required
        aria-label="Name"
        className="w-40"
      />
      <Input
        key={`amount-${category.updated_at}`}
        type="number"
        name="monthly_amount"
        step="0.01"
        min="0"
        onKeyDown={stepAmountByDollar}
        defaultValue={category.monthly_amount}
        aria-label="Monthly amount"
        className="w-28"
      />
      {line.isTransfers && (
        <span className="text-xs text-muted">
          Its budget is your Sinking expenses plus Source transfers.
        </span>
      )}
    </ExpandableRow>
  );
}
