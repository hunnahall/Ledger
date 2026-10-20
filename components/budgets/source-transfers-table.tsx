"use client";

import { useActionState, useState } from "react";
import { createSourceTransfer } from "@/lib/actions/source-transfers";
import { SourceTransferRow } from "@/components/budgets/source-transfer-row";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TableShell, TableEmptyRow } from "@/components/ui/table-shell";
import { Card } from "@/components/ui/card";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";
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
    <Card
      id="block:source-transfers"
      title="Source Transfers"
      action={
        <Button type="button" size="sm" onClick={() => setShowAdd(true)}>
          <AddIcon size={16} />
          Add source transfer
        </Button>
      }
      className="scroll-mt-6"
    >
      <TableShell
        bare
        columns={["Source transfer", "To", { label: "Monthly", align: "right" }, ""]}
        footer={
          sourceTransfers.length > 0 && (
            <tr className="h-9">
              <td className="px-4" colSpan={2}>Total</td>
              <td className="px-4 text-right">
                <Money
                  amount={sourceTransfers.reduce((sum, t) => sum + t.amount, 0)}
                  decimalPlaces={decimalPlaces}
                  symbol={false}
                />
              </td>
              <td />
            </tr>
          )
        }
      >
        {sourceTransfers.map((transfer) => (
          <SourceTransferRow
            key={transfer.id}
            transfer={transfer}
            sourceOptions={sourceOptions}
            decimalPlaces={decimalPlaces}
          />
        ))}

        {sourceTransfers.length === 0 && !showAdd && (
          <TableEmptyRow colSpan={4} label="No source transfers yet." />
        )}

        {showAdd && (
          <tr className="border-b border-border bg-surface-subtle">
            <td colSpan={4} className="px-4 py-3">
              <form
                action={createAction}
                onSubmit={() => setShowAdd(false)}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="flex flex-col gap-1 text-sm">
                  New source transfer
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
      </TableShell>
    </Card>
  );
}
