"use client";

import { updateCategory, deleteCategory } from "@/lib/actions/categories";
import { stepAmountByDollar } from "@/lib/dollar-step";
import {
  CATEGORY_STATUS_LABELS,
  type CategoryLine,
  type CategoryStatus,
} from "@/lib/budget/category-status";
import { BulletBar } from "@/components/charts/bullet-bar";
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
  is_transfers: boolean;
  updated_at: string;
};

export function CategoryRow({
  category,
  line,
  monthProgress,
  decimalPlaces,
  onOpen,
}: {
  category: EditableCategory;
  line: CategoryLine;
  /** dayOfMonth / daysInMonth when showing the current month, else null. */
  monthProgress: number | null;
  decimalPlaces: number;
  /** Opens this category's transactions for the month. */
  onOpen: () => void;
}) {
  return (
    <ExpandableRow
      onRowClick={onOpen}
      colSpan={7}
      expandLabel={`Edit ${category.name}`}
      collapseLabel="Collapse details"
      updateAction={updateCategory.bind(null, category.id)}
      deleteAction={deleteCategory.bind(null, category.id)}
      deleteMessage={`Delete the ${category.name} category? Its transactions become uncategorized, and any rules that file into it are deleted too.`}
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
          <td className="w-40 px-4">
            <BulletBar spent={line.spent} budget={line.budget} monthProgress={monthProgress} decimalPlaces={decimalPlaces} />
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
      <label className="flex items-center gap-2 text-sm">
        <input
          key={`transfers-${category.updated_at}`}
          type="checkbox"
          name="is_transfers"
          defaultChecked={category.is_transfers}
        />
        Transfers category
      </label>
      {line.isTransfers && (
        <span className="text-xs text-muted">
          Its budget is your Sinking expenses plus Source transfers.
        </span>
      )}
    </ExpandableRow>
  );
}
