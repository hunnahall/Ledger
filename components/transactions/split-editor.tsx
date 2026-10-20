"use client";

import { useState, useTransition } from "react";
import { saveSplits } from "@/lib/actions/transactions";
import {
  MAX_SPLIT_ROWS,
  validateSplitRows,
  type SplitPiece,
  type SplitRowInput,
} from "@/lib/transactions/splits";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Option = { id: string; name: string };
type Row = { amount: string; sourceId: string; categoryId: string; notes: string };

// The Source select's Exclude choice, same as on a transaction row.
const EXCLUDE = "__exclude__";

function rowsFromPieces(pieces: SplitPiece[], amount: number): Row[] {
  const filled: Row[] = pieces.map((p) => ({
    amount: String(p.amount),
    sourceId: p.excluded ? EXCLUDE : (p.sourceId ?? ""),
    categoryId: p.categoryId ?? "",
    notes: p.notes ?? "",
  }));
  // A new split starts with the whole amount on the first piece.
  if (filled.length === 0) filled.push({ amount: String(amount), sourceId: "", categoryId: "", notes: "" });
  while (filled.length < MAX_SPLIT_ROWS) filled.push({ amount: "", sourceId: "", categoryId: "", notes: "" });
  return filled;
}

// Splits one transaction into 2 to 4 transactions of its own. Each piece
// gets a Source (or Exclude), a Category when its Source is the Budget, an
// amount and a note, and counts in every figure like any other transaction.
// Saving with every amount blank removes the split.
export function SplitEditor({
  transactionId,
  transactionAmount,
  pieces,
  categories,
  sources,
  budgetSourceId,
  incomeSourceId,
  decimalPlaces,
  onDone,
}: {
  /** The original transaction (for a piece, its original). */
  transactionId: string;
  transactionAmount: number;
  pieces: SplitPiece[];
  categories: Option[];
  sources: Option[];
  budgetSourceId: string | null;
  incomeSourceId: string | null;
  decimalPlaces: number;
  onDone: () => void;
}) {
  const [rows, setRows] = useState(() => rowsFromPieces(pieces, transactionAmount));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSplit = pieces.length > 0;

  const assigned = rows.reduce((sum, r) => sum + Math.round((Number(r.amount) || 0) * 100), 0) / 100;
  const left = Math.round((transactionAmount - assigned) * 100) / 100;

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function submit(next: Row[]) {
    const inputs: SplitRowInput[] = next.map((r) => ({
      amount: Math.round((Number(r.amount) || 0) * 100) / 100,
      sourceId: r.sourceId && r.sourceId !== EXCLUDE ? r.sourceId : null,
      categoryId: r.categoryId || null,
      exclude: r.sourceId === EXCLUDE,
      notes: r.notes.trim(),
    }));
    const checked = validateSplitRows(transactionAmount, inputs, budgetSourceId);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    startTransition(async () => {
      const result = await saveSplits(transactionId, checked.rows);
      if (result?.error) setError(result.error);
      else {
        setError(null);
        onDone();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {isSplit ? "Edit split" : "Split into separate transactions"}
        </p>
        <p className={cn("font-mono text-xs tabular-nums", left === 0 ? "text-muted" : "text-foreground")}>
          {formatMoney(transactionAmount, decimalPlaces)} total &middot;{" "}
          {left === 0 ? "all assigned" : `${formatMoney(left, 2)} left`}
        </p>
      </div>

      {rows.map((row, i) => {
        const isBudget = budgetSourceId !== null && row.sourceId === budgetSourceId;
        const amount = Number(row.amount) || transactionAmount;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Select
              uiSize="sm"
              className="w-36"
              value={row.sourceId}
              onChange={(value) => update(i, { sourceId: value, categoryId: value === budgetSourceId ? row.categoryId : "" })}
              placeholder="No source"
            >
              <option value="">No source</option>
              {sources
                // Income only applies to money coming in.
                .filter((s) => s.id !== incomeSourceId || amount > 0)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              <option value={EXCLUDE}>Exclude</option>
            </Select>
            <Select
              uiSize="sm"
              className={cn("w-36", !isBudget && "bg-surface-subtle")}
              value={isBudget ? row.categoryId : ""}
              onChange={(value) => update(i, { categoryId: value })}
              disabled={!isBudget}
              placeholder={isBudget ? "Uncategorized" : "—"}
            >
              {isBudget && <option value="">Uncategorized</option>}
              {isBudget &&
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
            <Input
              uiSize="sm"
              type="number"
              step="0.01"
              value={row.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
              onKeyDown={stepAmountByDollar}
              placeholder="Amount"
              aria-label={`Piece ${i + 1} amount`}
              className="w-28 text-right"
            />
            <Input
              uiSize="sm"
              type="text"
              value={row.notes}
              onChange={(e) => update(i, { notes: e.target.value })}
              placeholder="Note"
              aria-label={`Piece ${i + 1} note`}
              className="min-w-32 flex-1"
            />
          </div>
        );
      })}

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" size="sm" disabled={isPending} onClick={() => submit(rows)}>
          {isPending ? "Saving" : "Save split"}
        </Button>
        <Button type="button" size="sm" disabled={isPending} onClick={onDone}>
          Cancel
        </Button>
        {isSplit && (
          <Button
            type="button"
            tone="negative"
            size="sm"
            disabled={isPending}
            className="ml-auto"
            onClick={() => submit(rows.map((r) => ({ ...r, amount: "" })))}
          >
            Remove split
          </Button>
        )}
      </div>
    </div>
  );
}
