"use client";

import { useActionState } from "react";
import { updateSourceTransfer, deleteSourceTransfer } from "@/lib/actions/source-transfers";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";

type SourceTransfer = {
  id: string;
  name: string;
  source_id: string;
  source_name: string;
  amount: number;
  updated_at: string;
};

export function SourceTransferRow({
  transfer,
  budgetId,
  sourceOptions,
  decimalPlaces,
  isLast,
  onAddClick,
}: {
  transfer: SourceTransfer;
  budgetId: string;
  sourceOptions: { id: string; name: string }[];
  decimalPlaces: number;
  isLast: boolean;
  onAddClick: () => void;
}) {
  const [updateState, updateAction] = useActionState(
    updateSourceTransfer.bind(null, transfer.id, budgetId),
    null,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteSourceTransfer.bind(null, transfer.id, budgetId),
    null,
  );

  return (
    <tr className="border-b border-border last:border-0">
      <td colSpan={3} className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form action={updateAction} className="flex flex-wrap items-center gap-3">
            <input
              key={`name-${transfer.updated_at}`}
              type="text"
              name="name"
              defaultValue={transfer.name}
              required
              className="w-36 rounded-md border border-border bg-background px-3 py-1.5"
            />
            <Select
              key={`source-${transfer.updated_at}`}
              name="source_id"
              uiSize="sm"
              className="w-36"
              defaultValue={transfer.source_id}
            >
              {sourceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <input
              key={`amount-${transfer.updated_at}`}
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              onKeyDown={stepAmountByDollar}
              defaultValue={transfer.amount}
              className="w-24 rounded-md border border-border bg-background px-3 py-1.5"
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
              aria-label="Add Source Transfer"
              onClick={onAddClick}
            >
              <AddIcon />
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          <Money amount={transfer.amount} decimalPlaces={decimalPlaces} />
          /mo &rarr; {transfer.source_name}
        </p>
      </td>
    </tr>
  );
}
