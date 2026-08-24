"use client";

import { useActionState, useState } from "react";
import { updateSourceTransfer, deleteSourceTransfer } from "@/lib/actions/source-transfers";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddIcon, ChevronDownIcon } from "@/components/ui/icons";
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
  const [expanded, setExpanded] = useState(false);
  const [updateState, updateAction] = useActionState(
    updateSourceTransfer.bind(null, transfer.id, budgetId),
    null,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteSourceTransfer.bind(null, transfer.id, budgetId),
    null,
  );

  return (
    <>
      <tr className="border-b border-border last:border-0 align-middle">
        <td className="px-4 py-3 font-medium">{transfer.name}</td>
        <td className="px-4 py-3">
          <Money amount={transfer.amount} decimalPlaces={decimalPlaces} />/mo
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Collapse details" : "Edit Source Transfer"}
              aria-expanded={expanded}
              className="rounded p-1 text-muted transition-transform duration-150 hover:bg-background"
            >
              <ChevronDownIcon size={14} className={expanded ? "rotate-180" : ""} />
            </button>
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
        </td>
      </tr>

      {/* Always rendered (never unmounted) so a save doesn't remount this
          subtree — see the equivalent comment in SinkingExpenseRow; only
          visibility toggles. */}
      <tr className={`border-b border-border bg-surface-subtle last:border-0 ${expanded ? "" : "hidden"}`}>
        <td colSpan={3} className="px-4 py-3">
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
        </td>
      </tr>
    </>
  );
}
