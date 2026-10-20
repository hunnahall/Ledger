"use client";

import { updateSourceTransfer, deleteSourceTransfer } from "@/lib/actions/source-transfers";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { Tag } from "@/components/ui/badge";
import { ExpandableRow } from "@/components/budgets/expandable-row";
import { Input } from "@/components/ui/input";

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
  sourceOptions,
  decimalPlaces,
}: {
  transfer: SourceTransfer;
  sourceOptions: { id: string; name: string }[];
  decimalPlaces: number;
}) {
  return (
    <ExpandableRow
      colSpan={4}
      expandLabel={`Edit ${transfer.name}`}
      collapseLabel="Collapse details"
      updateAction={updateSourceTransfer.bind(null, transfer.id)}
      deleteAction={deleteSourceTransfer.bind(null, transfer.id)}
      compactCells={
        <>
          <td className="px-4 font-medium">{transfer.name}</td>
          <td className="px-4">
            <Tag>{transfer.source_name}</Tag>
          </td>
          <td className="px-4 text-right">
            <Money amount={transfer.amount} decimalPlaces={decimalPlaces} symbol={false} />
          </td>
        </>
      }
    >
      <Input
        key={`name-${transfer.updated_at}`}
        type="text"
        name="name"
        defaultValue={transfer.name}
        required
        className="w-36"
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
      <Input
        key={`amount-${transfer.updated_at}`}
        type="number"
        name="amount"
        step="0.01"
        min="0.01"
        onKeyDown={stepAmountByDollar}
        defaultValue={transfer.amount}
        className="w-24"
      />
    </ExpandableRow>
  );
}
