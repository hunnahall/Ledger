"use client";

import { useActionState, useState } from "react";
import { createCategory } from "@/lib/actions/categories";
import type { CategoryLine } from "@/lib/budget/category-status";
import { CategoryRow, type EditableCategory } from "@/components/budget/category-row";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";
import { useModal } from "@/components/ui/modal";
import { TransactionsPopupList } from "@/components/dashboard/transactions-popup-list";
import { SortableHeader, useSortDirection } from "@/components/ui/sortable-header";
import { TableShell, TableEmptyRow } from "@/components/ui/table-shell";
import { Input } from "@/components/ui/input";

export function CategoriesTable({
  categories,
  lines,
  totals,
  monthProgress,
  monthISO,
  decimalPlaces,
}: {
  categories: EditableCategory[];
  lines: CategoryLine[];
  totals: { budget: number; spent: number; left: number };
  monthProgress: number | null;
  monthISO: string;
  decimalPlaces: number;
}) {
  const { open, modal } = useModal();
  const [showAdd, setShowAdd] = useState(false);
  const [createState, createAction] = useActionState(createCategory, null);
  const rows = lines.map((line) => ({ line, category: categories.find((c) => c.id === line.id)! }));
  const { sorted, direction, cycle } = useSortDirection(rows, (r) => r.line.budget);

  return (
    <Card
      title="Categories"
      action={
        <Button type="button" size="sm" onClick={() => setShowAdd(true)}>
          <AddIcon size={16} />
          Add category
        </Button>
      }
    >
      <TableShell
        bare
        columns={[
          "Category",
          { label: <SortableHeader label="Budget" direction={direction} onClick={cycle} className="inline-flex" />, align: "right" },
          { label: "Spent", align: "right" },
          { label: "Left", align: "right" },
          "Progress",
          "Status",
          "",
        ]}
        footer={
          lines.length > 0 && (
            <tr className="h-9">
              <td className="px-4">Total</td>
              <td className="px-4 text-right">
                <Money amount={totals.budget} decimalPlaces={decimalPlaces} symbol={false} />
              </td>
              <td className="px-4 text-right">
                <Money amount={totals.spent} decimalPlaces={decimalPlaces} symbol={false} />
              </td>
              <td className={totals.left < 0 ? "px-4 text-right text-danger" : "px-4 text-right"}>
                <Money amount={totals.left} decimalPlaces={decimalPlaces} symbol={false} />
              </td>
              <td colSpan={3} />
            </tr>
          )
        }
      >
        {showAdd && (
          <tr className="border-b border-border bg-surface-subtle">
            <td colSpan={7} className="px-4 py-3">
              <form
                action={createAction}
                onSubmit={() => setShowAdd(false)}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="flex flex-col gap-1 text-sm">
                  New category
                  <Input type="text" name="name" required placeholder="e.g. Groceries" className="w-40" autoFocus />
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
                <Button type="submit" variant="primary" size="sm">
                  Add
                </Button>
                <Button type="button" variant="tertiary" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </form>
            </td>
          </tr>
        )}

        {sorted.map(({ line, category }) => (
          <CategoryRow
            key={line.id}
            category={category}
            line={line}
            monthProgress={monthProgress}
            decimalPlaces={decimalPlaces}
            onOpen={() =>
              open(
                <TransactionsPopupList
                  title={line.name}
                  kind={{ type: "category", categoryId: line.id }}
                  months={[monthISO]}
                  decimalPlaces={decimalPlaces}
                />,
              )
            }
          />
        ))}

        {lines.length === 0 && !showAdd && <TableEmptyRow colSpan={7} label="No categories yet." />}
      </TableShell>
      {modal}
      {createState?.error && <p className="px-5 py-2 text-xs text-danger">{createState.error}</p>}
    </Card>
  );
}
