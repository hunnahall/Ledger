"use client";

import { updateSourceTransfer, deleteSourceTransfer } from "@/lib/actions/source-transfers";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { ExpandableRow } from "@/components/budgets/expandable-row";

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
  isLast,
  onAddClick,
}: {
  transfer: SourceTransfer;
  sourceOptions: { id: string; name: string }[];
  decimalPlaces: number;
  isLast: boolean;
  onAddClick: () => void;
}) {
  return (
    <ExpandableRow
      colSpan={3}
      isLast={isLast}
      addLabel="Add Source Transfer"
      expandLabel="Edit Source Transfer"
      collapseLabel="Collapse details"
      onAddClick={onAddClick}
      updateAction={updateSourceTransfer.bind(null, transfer.id)}
      deleteAction={deleteSourceTransfer.bind(null, transfer.id)}
      compactCells={
        <>
          <td className="px-4 py-3 font-medium">{transfer.name}</td>
          <td className="px-4 py-3">
            <Money amount={transfer.amount} decimalPlaces={decimalPlaces} />/mo
          </td>
        </>
      }
    >
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
    </ExpandableRow>
  );
}
