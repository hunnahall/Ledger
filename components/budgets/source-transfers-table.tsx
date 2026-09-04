"use client";

import { useActionState, useState } from "react";
import { createSourceTransfer } from "@/lib/actions/source-transfers";
import { SourceTransferRow } from "@/components/budgets/source-transfer-row";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TableShell, TableEmptyRow } from "@/components/ui/table-shell";
import { Input } from "@/components/ui/input";

type SourceTransfer = {
  id: string;
  name: string;
  source_id: string;
  source_name: string;
  amount: number;
  updated_at: string;
};

export function SourceTransfersTable({
  sourceTransfers,
  sourceOptions,
  decimalPlaces,
}: {
  sourceTransfers: SourceTransfer[];
  sourceOptions: { id: string; name: string }[];
  decimalPlaces: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [, createAction] = useActionState(createSourceTransfer, null);

  return (
    <TableShell columns={["Source Transfer", "Monthly", ""]}>
      {sourceTransfers.map((transfer, index) => (
        <SourceTransferRow
          key={transfer.id}
          transfer={transfer}
          sourceOptions={sourceOptions}
          decimalPlaces={decimalPlaces}
          isLast={!showAdd && index === sourceTransfers.length - 1}
          onAddClick={() => setShowAdd(true)}
        />
      ))}

      {sourceTransfers.length === 0 && !showAdd && (
        <TableEmptyRow colSpan={3} label="Add Source Transfer" onClick={() => setShowAdd(true)} />
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
                New Source Transfer
                <Input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Savings"
                  className="w-36"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Source
                <Select name="source_id" className="w-36" placeholder="Choose a source">
                  <option value="">Choose a source</option>
                  {sourceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Monthly amount
                <Input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  onKeyDown={stepAmountByDollar}
                  defaultValue={0}
                  className="w-24"
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
