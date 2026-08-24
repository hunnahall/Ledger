"use client";

import { useActionState, useState } from "react";
import { createSourceTransfer } from "@/lib/actions/source-transfers";
import { SourceTransferRow } from "@/components/budgets/source-transfer-row";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";

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
  budgetId,
  sourceOptions,
  decimalPlaces,
}: {
  sourceTransfers: SourceTransfer[];
  budgetId: string;
  sourceOptions: { id: string; name: string }[];
  decimalPlaces: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [, createAction] = useActionState(createSourceTransfer.bind(null, budgetId), null);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Source Transfer</th>
            <th className="px-4 py-3 font-medium">Monthly</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sourceTransfers.map((transfer, index) => (
            <SourceTransferRow
              key={transfer.id}
              transfer={transfer}
              budgetId={budgetId}
              sourceOptions={sourceOptions}
              decimalPlaces={decimalPlaces}
              isLast={!showAdd && index === sourceTransfers.length - 1}
              onAddClick={() => setShowAdd(true)}
            />
          ))}

          {sourceTransfers.length === 0 && !showAdd && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center">
                <Button
                  type="button"
                  variant="accent"
                  size="icon"
                  aria-label="Add Source Transfer"
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
                  action={createAction}
                  onSubmit={() => setShowAdd(false)}
                  className="flex flex-wrap items-end gap-3"
                >
                  <label className="flex flex-col gap-1 text-sm">
                    New Source Transfer
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Savings"
                      className="w-36 rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      onKeyDown={stepAmountByDollar}
                      defaultValue={0}
                      className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
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
