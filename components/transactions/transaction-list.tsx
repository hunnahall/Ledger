"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  assignTransaction,
  bulkUpdateTransactions,
  deleteTransaction,
  saveSplits,
} from "@/lib/actions/transactions";
import { encodeBucketOption } from "@/lib/transactions/bucket-option";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

export type TransactionRowData = {
  id: string;
  updatedAt: string;
  postedDate: string;
  description: string;
  accountName: string | null;
  amount: number;
  categoryId: string | null;
  sourceId: string | null;
  isTransfer: boolean;
  transferFromSourceId: string | null;
  transferFromFundId: string | null;
  transferToSourceId: string | null;
  transferToFundId: string | null;
  excludeFromBudget: boolean;
  notes: string | null;
  isSplit: boolean;
  hasProviderTransactionId: boolean;
  splits: { id: string; categoryId: string | null; sourceId: string | null; amount: number }[];
};

type Option = { id: string; name: string };
type BucketOption = { value: string; label: string };

const CLEAR = "__clear__";
const MAX_SPLIT_ROWS = 4;

export function TransactionList({
  transactions,
  categories,
  sources,
  bucketOptions,
  bucketNameByValue,
  decimalPlaces,
}: {
  transactions: TransactionRowData[];
  categories: Option[];
  sources: Option[];
  bucketOptions: BucketOption[];
  bucketNameByValue: Record<string, string>;
  decimalPlaces: number;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSource, setBulkSource] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(transactions.map((t) => t.id)));
  }

  function applyBulkEdit() {
    const updates: { categoryId?: string | null; sourceId?: string | null } = {};
    if (bulkCategory !== "") updates.categoryId = bulkCategory === CLEAR ? null : bulkCategory;
    if (bulkSource !== "") updates.sourceId = bulkSource === CLEAR ? null : bulkSource;
    if (Object.keys(updates).length === 0) return;

    const ids = Array.from(selectedIds);
    startTransition(async () => {
      await bulkUpdateTransactions(ids, updates);
      setSelectedIds(new Set());
      setBulkCategory("");
      setBulkSource("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          className="h-4 w-4 accent-foreground"
          aria-label="Select all transactions"
        />
        {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
      </label>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-subtle p-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Set category
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">No change</option>
              <option value={CLEAR}>Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Set source
            <select
              value={bulkSource}
              onChange={(e) => setBulkSource(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">No change</option>
              <option value={CLEAR}>No source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending || (bulkCategory === "" && bulkSource === "")}
            onClick={applyBulkEdit}
          >
            {isPending ? "Applying…" : `Apply to ${selectedIds.size} transactions`}
          </Button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="pb-2 text-xs text-muted hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {transactions.map((txn) => {
        const currentTransferFrom = txn.transferFromSourceId
          ? encodeBucketOption({ type: "source", id: txn.transferFromSourceId })
          : txn.transferFromFundId
            ? encodeBucketOption({ type: "fund", id: txn.transferFromFundId })
            : "";
        const currentTransferTo = txn.transferToSourceId
          ? encodeBucketOption({ type: "source", id: txn.transferToSourceId })
          : txn.transferToFundId
            ? encodeBucketOption({ type: "fund", id: txn.transferToFundId })
            : "";

        return (
          <div
            key={`${txn.id}-${txn.updatedAt}`}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(txn.id)}
              onChange={() => toggleSelect(txn.id)}
              className="mt-1.5 h-4 w-4 shrink-0 accent-foreground"
              aria-label={`Select transaction: ${txn.description}`}
            />
            <div className="min-w-0 flex-1">
              <form
                action={assignTransaction.bind(null, txn.id)}
                className="flex flex-wrap items-center gap-3"
              >
                <div className="w-24 text-sm text-muted">
                  {new Date(txn.postedDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </div>
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{txn.description}</p>
                  <p className="text-xs text-muted">{txn.accountName}</p>
                </div>
                <div
                  className={`w-24 text-right text-sm font-medium ${
                    txn.amount < 0 ? "text-negative" : "text-positive"
                  }`}
                >
                  <Money amount={txn.amount} decimalPlaces={decimalPlaces} />
                </div>
                <select
                  name="category_id"
                  defaultValue={txn.categoryId ?? ""}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  name="source_id"
                  defaultValue={txn.sourceId ?? ""}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">No source</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" name="is_transfer" defaultChecked={txn.isTransfer} />
                  Transfer
                </label>
                <select
                  name="transfer_from"
                  defaultValue={currentTransferFrom}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">Transfer from&hellip;</option>
                  {bucketOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <select
                  name="transfer_to"
                  defaultValue={currentTransferTo}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">Transfer to&hellip;</option>
                  {bucketOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    name="exclude_from_budget"
                    defaultChecked={txn.excludeFromBudget}
                  />
                  Exclude from budget
                </label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={txn.notes ?? ""}
                  placeholder="Notes"
                  className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                />
                <Button type="submit" size="sm">
                  Save
                </Button>
                {!txn.hasProviderTransactionId && (
                  <Button
                    type="submit"
                    size="sm"
                    tone="negative"
                    formAction={deleteTransaction.bind(null, txn.id)}
                  >
                    Delete
                  </Button>
                )}
              </form>
              {txn.isTransfer && (currentTransferFrom || currentTransferTo) && (
                <p className="mt-2 text-xs text-muted">
                  Transfer: {formatMoney(Math.abs(txn.amount), decimalPlaces)}{" "}
                  {bucketNameByValue[currentTransferFrom] ?? "outside"} &rarr;{" "}
                  {bucketNameByValue[currentTransferTo] ?? "outside"}
                </p>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted">
                  {txn.isSplit ? `Split into ${txn.splits.length} lines` : "Split transaction"}
                </summary>
                <form
                  action={saveSplits.bind(null, txn.id, txn.amount)}
                  className="mt-2 flex flex-col gap-2"
                >
                  {Array.from({ length: MAX_SPLIT_ROWS }, (_, i) => i + 1).map((i) => {
                    const existing = txn.splits[i - 1];
                    return (
                      <div
                        key={existing?.id ?? `new-${i}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <select
                          name={`split_category_${i}`}
                          defaultValue={existing?.categoryId ?? ""}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">No category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name={`split_source_${i}`}
                          defaultValue={existing?.sourceId ?? ""}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">No source</option>
                          {sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          name={`split_amount_${i}`}
                          defaultValue={existing?.amount ?? ""}
                          placeholder="Amount"
                          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted">
                    Split amounts must sum to {formatMoney(txn.amount, decimalPlaces)}. Leave all
                    fields blank to remove the split.
                  </p>
                  <button
                    type="submit"
                    className="w-fit rounded-md border border-border px-3 py-1.5 text-xs hover:bg-background"
                  >
                    Save split
                  </button>
                </form>
              </details>
            </div>
          </div>
        );
      })}
      {transactions.length === 0 && (
        <Card className="text-center text-sm text-muted">No transactions match these filters.</Card>
      )}
    </div>
  );
}
