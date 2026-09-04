"use client";

import { useActionState } from "react";
import { saveSplits } from "@/lib/actions/transactions";
import { MAX_SPLIT_ROWS } from "@/lib/transactions/splits";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { formatMoney } from "@/lib/format";
import { Select } from "@/components/ui/select";

type Option = { id: string; name: string };
type Split = { id: string; categoryId: string | null; sourceId: string | null; amount: number };

// Split one transaction across several category/source pairs. Lifted out of
// TransactionRow, which was carrying this whole form inline alongside a
// dozen other concerns.
//
// The rows are uncontrolled (defaultValue) and submitted as a plain form:
// saveSplits rebuilds the whole split set from the submitted fields each
// time, so there's nothing here worth mirroring into React state. Leaving
// every field blank removes the split.
export function SplitEditor({
  transactionId,
  transactionAmount,
  splits,
  categories,
  sources,
  decimalPlaces,
}: {
  transactionId: string;
  transactionAmount: number;
  splits: Split[];
  categories: Option[];
  sources: Option[];
  decimalPlaces: number;
}) {
  // The amount isn't passed to the action: saveSplits reads it server-side
  // so the "splits must sum to the transaction" check can't be bypassed from
  // the client.
  const [state, formAction] = useActionState(saveSplits.bind(null, transactionId), null);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      {Array.from({ length: MAX_SPLIT_ROWS }, (_, i) => i + 1).map((i) => {
        const existing = splits[i - 1];
        return (
          <div key={existing?.id ?? `new-${i}`} className="flex flex-wrap items-center gap-2">
            <Select
              name={`split_category_${i}`}
              uiSize="sm"
              className="w-36 py-1 text-xs"
              defaultValue={existing?.categoryId ?? ""}
              placeholder="No category"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              name={`split_source_${i}`}
              uiSize="sm"
              className="w-36 py-1 text-xs"
              defaultValue={existing?.sourceId ?? ""}
              placeholder="No source"
            >
              <option value="">No source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <input
              type="number"
              step="0.01"
              name={`split_amount_${i}`}
              onKeyDown={stepAmountByDollar}
              defaultValue={existing?.amount ?? ""}
              placeholder="Amount"
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Split amounts must sum to {formatMoney(transactionAmount, decimalPlaces)}. Leave all fields
        blank to remove the split.
      </p>
      <button
        type="submit"
        className="w-fit rounded-md border border-border px-3 py-1.5 text-xs hover:bg-background"
      >
        Save split
      </button>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
