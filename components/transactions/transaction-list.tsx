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
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { ChevronDownIcon } from "@/components/ui/icons";

export type TransactionRowData = {
  id: string;
  updatedAt: string;
  postedDate: string;
  description: string;
  accountName: string | null;
  amount: number;
  categoryId: string | null;
  categorySource: string | null;
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
            <Select value={bulkCategory} onChange={setBulkCategory} uiSize="sm" className="w-40" placeholder="No change">
              <option value="">No change</option>
              <option value={CLEAR}>Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Set source
            <Select value={bulkSource} onChange={setBulkSource} uiSize="sm" className="w-40" placeholder="No change">
              <option value="">No change</option>
              <option value={CLEAR}>No source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
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

      {transactions.length === 0 ? (
        <Card className="text-center text-sm text-muted">No transactions match these filters.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted">
                <th className="w-8 px-2 py-2"></th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Account</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 text-right font-medium">Amount</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Source</th>
                <th className="w-8 px-2 py-2"></th>
                <th className="w-20 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <TransactionRow
                  key={`${txn.id}-${txn.updatedAt}`}
                  txn={txn}
                  categories={categories}
                  sources={sources}
                  bucketOptions={bucketOptions}
                  bucketNameByValue={bucketNameByValue}
                  decimalPlaces={decimalPlaces}
                  selected={selectedIds.has(txn.id)}
                  onToggleSelect={() => toggleSelect(txn.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TransactionRow({
  txn,
  categories,
  sources,
  bucketOptions,
  bucketNameByValue,
  decimalPlaces,
  selected,
  onToggleSelect,
}: {
  txn: TransactionRowData;
  categories: Option[];
  sources: Option[];
  bucketOptions: BucketOption[];
  bucketNameByValue: Record<string, string>;
  decimalPlaces: number;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [isTransfer, setIsTransfer] = useState(txn.isTransfer);
  const [expanded, setExpanded] = useState(false);

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

  const typeLabel = isTransfer ? "Transfer" : txn.excludeFromBudget ? "Excluded" : null;

  return (
    <>
      <tr className="border-b border-border last:border-0 align-middle">
        <td className="px-2 py-1.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 accent-foreground"
            aria-label={`Select transaction: ${txn.description}`}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-muted">
          {new Date(txn.postedDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}
        </td>
        <td className="max-w-32 truncate px-2 py-1.5 text-muted" title={txn.accountName ?? ""}>
          {txn.accountName}
        </td>
        <td className="max-w-0 w-full truncate px-2 py-1.5 font-medium" title={txn.description}>
          {txn.description}
          {typeLabel && (
            <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-xs font-normal text-muted">
              {typeLabel}
            </span>
          )}
        </td>
        <td
          className={`whitespace-nowrap px-2 py-1.5 text-right font-medium ${
            txn.amount < 0 ? "text-negative" : "text-positive"
          }`}
        >
          <Money amount={txn.amount} decimalPlaces={decimalPlaces} />
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <Select
              form={`txn-${txn.id}`}
              name="category_id"
              uiSize="sm"
              className="w-32"
              defaultValue={txn.categoryId ?? ""}
              placeholder={isTransfer ? "—" : "Uncategorized"}
              disabled={isTransfer}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {txn.categorySource === "rule" && (
              <span
                className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[0.65rem] text-muted"
                title="Auto-categorized from a learned rule"
              >
                auto
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-1.5">
          <Select
            form={`txn-${txn.id}`}
            name="source_id"
            uiSize="sm"
            className="w-32"
            defaultValue={txn.sourceId ?? ""}
            placeholder={isTransfer ? "—" : "No source"}
            disabled={isTransfer}
          >
            <option value="">No source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-2 py-1.5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            aria-expanded={expanded}
            className="rounded p-1 text-muted transition-transform duration-150 hover:bg-background"
          >
            <ChevronDownIcon size={14} className={expanded ? "rotate-180" : ""} />
          </button>
        </td>
        <td className="whitespace-nowrap px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button
              form={`txn-${txn.id}`}
              type="submit"
              className="rounded p-1.5 text-muted hover:bg-background"
              aria-label="Save transaction"
              title="Save"
            >
              <CheckIcon />
            </button>
            {!txn.hasProviderTransactionId && (
              <button
                form={`txn-${txn.id}`}
                type="submit"
                formAction={deleteTransaction.bind(null, txn.id)}
                className="rounded p-1.5 text-negative hover:bg-background"
                aria-label="Delete transaction"
                title="Delete"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Always rendered (never unmounted) so the form= references from the
          main row's Category/Source selects and Save/Delete buttons keep
          resolving to this form regardless of expand state — only the
          visibility is toggled. */}
      <tr className={`border-b border-border bg-surface-subtle last:border-0 ${expanded ? "" : "hidden"}`}>
          <td colSpan={9} className="px-4 py-3">
            <form
              id={`txn-${txn.id}`}
              action={assignTransaction.bind(null, txn.id)}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={isTransfer}
                  onChange={(e) => setIsTransfer(e.target.checked)}
                />
                <input type="hidden" name="is_transfer" value={isTransfer ? "on" : ""} />
                Transfer
              </label>

              {isTransfer && (
                <>
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Transfer from
                    <Select name="transfer_from" uiSize="sm" className="w-36" defaultValue={currentTransferFrom} placeholder="None">
                      <option value="">None</option>
                      {bucketOptions.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Transfer to
                    <Select name="transfer_to" uiSize="sm" className="w-36" defaultValue={currentTransferTo} placeholder="None">
                      <option value="">None</option>
                      {bucketOptions.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </>
              )}

              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  name="exclude_from_budget"
                  defaultChecked={txn.excludeFromBudget}
                />
                Exclude from budget
              </label>
              <label className="flex flex-1 min-w-40 flex-col gap-1 text-xs text-muted">
                Notes
                <input
                  type="text"
                  name="notes"
                  defaultValue={txn.notes ?? ""}
                  placeholder="Notes"
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
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
          </td>
        </tr>
    </>
  );
}

function CheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={16} height={16} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
    </svg>
  );
}
