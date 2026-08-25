"use client";

import { memo, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  assignTransaction,
  bulkUpdateTransactions,
  createSourceFromTransaction,
  deleteTransaction,
  saveSplits,
  suggestCategoryForDescription,
} from "@/lib/actions/transactions";
import { UNCATEGORIZED_FILTER_VALUE } from "@/lib/transactions/filters";
import { encodeBucketOption } from "@/lib/transactions/bucket-option";
import { MAX_SPLIT_ROWS } from "@/lib/transactions/splits";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { AddIcon, ChevronDownIcon, SpinnerIcon } from "@/components/ui/icons";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DateRangeColumnFilter, SelectColumnFilter } from "./column-filter";
import { SearchToggle } from "./search-toggle";

export type TransactionRowData = {
  id: string;
  updatedAt: string;
  postedDate: string;
  description: string;
  accountName: string | null;
  accountLast4: string | null;
  amount: number;
  categoryId: string | null;
  categorySource: string | null;
  sourceId: string | null;
  isTransfer: boolean;
  isIncome: boolean;
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
type AccountOption = { id: string; account_name: string };
type BucketOption = { value: string; label: string };

// A sentinel option in the Category select rather than a separate
// checkbox — always available regardless of which budget's categories
// are currently loaded, since it isn't a real categories row. Picking it
// sets is_income and clears category_id; picking a real category (or
// Uncategorized) clears is_income back out.
const INCOME = "__income__";
// Same idea, in the Source select: picking it doesn't change source_id
// directly — it reveals the inline "create a source from this amount"
// form instead (see addingSource below).
const ADD_SOURCE = "__add_source__";

// accounts.last4 isn't populated by anything in this app yet (no bank-sync
// pipeline writes it), so the Account column would otherwise show nothing
// for every real account. Every account here happens to already carry its
// last 4 digits at the end of its name (e.g. "Venture X (4440)", entered
// that way at account-creation time) — fall back to pulling them from
// there so the narrower column still shows something useful.
function accountLast4(name: string | null): string | null {
  return name?.match(/\((\d{4})\)\s*$/)?.[1] ?? null;
}

export function TransactionList({
  transactions,
  accounts,
  categories,
  sources,
  bucketOptions,
  bucketNameByValue,
  decimalPlaces,
}: {
  transactions: TransactionRowData[];
  accounts: AccountOption[];
  categories: Option[];
  sources: Option[];
  bucketOptions: BucketOption[];
  bucketNameByValue: Record<string, string>;
  decimalPlaces: number;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);
  // State (not a ref) so its value can be read during render below — a
  // ref's `.current` can't be, since it isn't tracked by React and reading
  // it during render risks seeing a stale value. This is set from the list
  // div's own ref callback once it mounts (see below), which is the
  // supported way to measure a DOM node right after it exists.
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);

  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  // Rendering hundreds of rows at once was the main cost on this page — each
  // one mounts two of the custom Select dropdowns, and hydrating all of them
  // up front (measured: ~1.6s of the ~2.6s Dashboard→Transactions nav time)
  // dwarfed the ~1s the actual data fetch took. Only mounting the rows near
  // the viewport cuts that down to whatever a screenful actually costs.
  // Window-scrolled (not an inner scroll box) since the page itself scrolls;
  // dynamic sizing (rather than a fixed estimate) because a row's real
  // height varies by breakpoint (stacked card vs. single line) and by
  // whether it's expanded.
  const rowVirtualizer = useWindowVirtualizer({
    count: transactions.length,
    estimateSize: () => 48,
    overscan: 10,
    scrollMargin: listEl?.offsetTop ?? 0,
  });

  // Stable identity (via useCallback) so it can be passed straight through
  // to each memoized TransactionRow without defeating memoization — an
  // inline `() => toggleSelect(txn.id)` per row would give every row a
  // fresh callback (and thus force a re-render) on every selection change,
  // which across hundreds of rows is what made clicking a checkbox feel
  // slow.
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(transactions.map((t) => t.id)));
  }

  // Editing the Category or Source select on any one selected row applies
  // that same value to every other selected row too — no separate bulk
  // form to fill in. Selection is left in place afterward so the user can
  // set both fields (or fix a mistake) with another pick before clearing it.
  const applyBulkCategory = useCallback(
    (categoryId: string | null) => {
      const ids = Array.from(selectedIds);
      startTransition(async () => {
        const result = await bulkUpdateTransactions(ids, { categoryId });
        setBulkError(result?.error ?? null);
      });
    },
    [selectedIds],
  );

  const applyBulkSource = useCallback(
    (sourceId: string | null) => {
      const ids = Array.from(selectedIds);
      startTransition(async () => {
        const result = await bulkUpdateTransactions(ids, { sourceId });
        setBulkError(result?.error ?? null);
      });
    },
    [selectedIds],
  );

  return (
    <div className="flex flex-col gap-3">
      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-elevated">
            <span className="font-medium whitespace-nowrap">
              {selectedIds.size} selected
            </span>
            <span className="hidden text-xs text-muted sm:inline">
              Change a category or source on any selected row to apply it to all
            </span>
            {isPending && <SpinnerIcon className="animate-spin shrink-0" size={14} />}
            {bulkError && <span className="text-xs text-negative">{bulkError}</span>}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="shrink-0 text-xs text-muted hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <Card className="text-center text-sm text-muted">No transactions match these filters.</Card>
      ) : (
        // Below md, each transaction renders as a stacked card instead of a
        // table row — a real <table> forces every column onto one line, which
        // on a phone-width screen either overflows (forcing sideways
        // scrolling to see the amount) or truncates everything unreadably.
        // Rows use the CSS `contents` trick (see TransactionRow) to reflow
        // into a single-line table on wider screens without duplicating any
        // fields, so there's one row layout, not two parallel ones to keep in
        // sync.
        <div className="rounded-lg border border-border text-sm">
          <div className="hidden items-center gap-1.5 border-b border-border bg-surface-subtle px-2 py-2 text-left text-sm text-muted md:flex">
            <span className="flex w-8 shrink-0 items-center">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 accent-foreground"
                aria-label="Select all transactions"
              />
            </span>
            <DateRangeColumnFilter label="Date" className="w-20 shrink-0 font-medium" />
            <SelectColumnFilter
              label="Account"
              paramKey="account_id"
              options={accounts.map((a) => ({ value: a.id, label: a.account_name }))}
              className="w-14 shrink-0 font-medium"
            />
            <span className="md:max-w-[260px] md:flex-1 text-center font-medium">Description</span>
            <span className="md:ml-4 w-24 shrink-0 text-center font-medium">Amount</span>
            <SelectColumnFilter
              label="Category"
              paramKey="category_id"
              options={[
                { value: UNCATEGORIZED_FILTER_VALUE, label: "Uncategorized" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="w-40 shrink-0 font-medium"
            />
            <SelectColumnFilter
              label="Source"
              paramKey="source_id"
              options={sources.map((s) => ({ value: s.id, label: s.name }))}
              className="w-40 shrink-0 font-medium"
            />
            <span className="w-20 shrink-0 text-center font-medium">Add Rule</span>
            <span className="w-8 shrink-0"></span>
            <span className="flex w-10 shrink-0 items-center justify-center">
              <SearchToggle />
            </span>
          </div>
          <div ref={setListEl} style={{ position: "relative", height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const txn = transactions[virtualRow.index];
              return (
                <div
                  key={txn.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <TransactionRow
                    txn={txn}
                    categories={categories}
                    sources={sources}
                    bucketOptions={bucketOptions}
                    bucketNameByValue={bucketNameByValue}
                    decimalPlaces={decimalPlaces}
                    selected={selectedIds.has(txn.id)}
                    onToggleSelect={toggleSelect}
                    selectedCount={selectedIds.size}
                    onBulkApplyCategory={applyBulkCategory}
                    onBulkApplySource={applyBulkSource}
                    isLastRow={virtualRow.index === transactions.length - 1}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized so that selecting/deselecting one row (or any other state change
// in the parent list) doesn't re-render every other row — with hundreds of
// transactions each rendering two custom dropdown components, that
// cascading re-render was the main source of UI lag on simple clicks.
const TransactionRow = memo(function TransactionRow({
  txn,
  categories,
  sources,
  bucketOptions,
  bucketNameByValue,
  decimalPlaces,
  selected,
  onToggleSelect,
  selectedCount,
  onBulkApplyCategory,
  onBulkApplySource,
  isLastRow,
}: {
  txn: TransactionRowData;
  categories: Option[];
  sources: Option[];
  bucketOptions: BucketOption[];
  bucketNameByValue: Record<string, string>;
  decimalPlaces: number;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  // How many rows are currently selected app-wide, and callbacks that apply
  // a value to all of them at once — used so that changing this row's own
  // Category/Source select propagates to the rest of the selection instead
  // of just saving this one row (see handleCategoryChange/handleSourceChange).
  selectedCount: number;
  onBulkApplyCategory: (categoryId: string | null) => void;
  onBulkApplySource: (sourceId: string | null) => void;
  // The list is virtualized, so at any moment the DOM's actual last child is
  // whichever row happens to be at the bottom of the rendered window, not
  // necessarily the last transaction — a CSS last:border-0 selector would
  // strip the border off whatever row that happened to be. This is passed
  // down instead so the real last row is the one that loses it.
  isLastRow: boolean;
}) {
  const [isTransfer, setIsTransfer] = useState(txn.isTransfer);
  const [isIncome, setIsIncome] = useState(txn.isIncome);
  // Purely a local, session-only preference — not persisted — for whether
  // picking a category on this row should go through the learn-a-rule
  // flow (existing-rule lookup, then the "make this a rule?" prompt) at
  // all. Off by default so categorizing a run of transactions doesn't
  // interrupt with a prompt after every single one; check it for the rows
  // where you actually want that.
  const [buildRule, setBuildRule] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [splitOpen, setSplitOpen] = useState(txn.isSplit);
  const [categoryId, setCategoryId] = useState(txn.isIncome ? INCOME : txn.categoryId ?? "");
  const [sourceId, setSourceId] = useState(txn.sourceId ?? "");
  const [addingSource, setAddingSource] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  // The row keeps a stable key (just txn.id) across saves so React updates
  // this DOM subtree in place instead of tearing it down and rebuilding it
  // on every edit — remounting on every save was fighting password-manager
  // extensions that inject overlays into the page's inputs (they hold
  // references into DOM nodes that a remount yanks out from under them,
  // throwing on cleanup and leaving controls looking inert). That means
  // these fields no longer auto-reset from a changed key, so adjust them
  // from fresh props here during render instead (React's recommended
  // pattern for this, rather than setState-in-effect).
  const [prevTxn, setPrevTxn] = useState(txn);
  if (
    txn.isTransfer !== prevTxn.isTransfer ||
    txn.isIncome !== prevTxn.isIncome ||
    txn.categoryId !== prevTxn.categoryId ||
    txn.sourceId !== prevTxn.sourceId ||
    txn.isSplit !== prevTxn.isSplit
  ) {
    setPrevTxn(txn);
    setIsTransfer(txn.isTransfer);
    setIsIncome(txn.isIncome);
    setCategoryId(txn.isIncome ? INCOME : txn.categoryId ?? "");
    setSourceId(txn.sourceId ?? "");
    setAddingSource(false);
    setSplitOpen(txn.isSplit);
  }

  // Every field in this row autosaves as soon as it changes — there's no
  // longer an explicit Save button. Reads the rest of the row's current
  // state straight off the DOM via the form's own FormData (this works even
  // for fields like Category/Source that live outside the <form> tag, since
  // they're associated with it through the form= attribute) and overrides
  // just the field that triggered this save. The override is required for
  // any field backed by a React-controlled hidden input (the Selects, and
  // the Transfer checkbox's hidden mirror) — its onChange fires before
  // React has re-rendered that hidden input with the new value, so reading
  // the DOM alone would still see the stale one. Plain native inputs
  // (Exclude checkbox, Notes) don't need an override: the browser updates
  // their DOM value before the change/blur handler runs.
  async function saveRow(overrides: Record<string, string> = {}) {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    for (const [key, value] of Object.entries(overrides)) {
      formData.set(key, value);
    }
    const result = await assignTransaction(txn.id, formData);
    setRowError(result?.error ?? null);
  }

  async function handleCategoryChange(newCategoryId: string) {
    const nowIncome = newCategoryId === INCOME;
    setCategoryId(newCategoryId);
    setIsIncome(nowIncome);

    // Part of a multi-selection: apply this pick to every selected row at
    // once instead of just this one. Income is a flag, not a real category
    // (bulkUpdateTransactions has no notion of it), so that pick still only
    // ever applies to this single row.
    if (selected && selectedCount > 1 && !nowIncome) {
      onBulkApplyCategory(newCategoryId || null);
      return;
    }

    const overrides: Record<string, string> = {
      category_id: nowIncome ? "" : newCategoryId,
      is_income: nowIncome ? "on" : "",
    };

    if (!buildRule) {
      // Build Rule unchecked: assign the category and leave rules alone
      // entirely — assignTransaction learns/reinforces a rule by default
      // whenever category_id is set, so this has to be explicit, not just
      // "don't show the prompt".
      overrides.rule_action = "skip";
    } else if (
      // Only a fresh, real category pick (changed from what's saved) for a
      // merchant with no existing rule needs the "make this a rule?"
      // prompt — Income isn't a real category to learn a rule for, and an
      // unchanged pick (or one that already matches a learned rule) is
      // just reinforcing what's already there.
      !isTransfer &&
      !nowIncome &&
      newCategoryId &&
      newCategoryId !== (txn.categoryId ?? "")
    ) {
      const existingRule = await suggestCategoryForDescription(txn.description);
      if (!existingRule) {
        const categoryName = categories.find((c) => c.id === newCategoryId)?.name ?? "this category";
        const saveRule = await confirm(`Make all "${txn.description}" transactions ${categoryName}?`);
        overrides.rule_action = saveRule ? "write" : "skip";
      }
    }

    await saveRow(overrides);
  }

  async function handleSourceChange(newSourceId: string) {
    if (newSourceId === ADD_SOURCE) {
      setAddingSource(true);
      return;
    }
    setSourceId(newSourceId);

    if (selected && selectedCount > 1) {
      onBulkApplySource(newSourceId || null);
      return;
    }

    await saveRow({ source_id: newSourceId });
  }

  async function handleTransferToggle(checked: boolean) {
    setIsTransfer(checked);
    await saveRow({ is_transfer: checked ? "on" : "" });
  }

  async function handleDelete() {
    const result = await deleteTransaction(txn.id);
    setRowError(result?.error ?? null);
  }

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

  const typeLabel = isTransfer
    ? "Transfer"
    : txn.excludeFromBudget
      ? "Excluded"
      : isIncome
        ? "Income"
        : null;

  const [splitsState, splitsAction] = useActionState(
    saveSplits.bind(null, txn.id, txn.amount),
    null,
  );
  const [createSourceState, createSourceAction] = useActionState(
    createSourceFromTransaction.bind(null, txn.id),
    null,
  );

  return (
    <>
      {dialog}
      <div className={isLastRow ? "" : "border-b border-border"}>
        {/* Below md this is a stacked card (each inner group is its own
            flex row); at md+ every inner group switches to `contents`,
            which dissolves its own box so its children fall in as direct
            items of this flex row — same fields, same form associations,
            just reflowed into one line instead of duplicated. */}
        <div className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-1.5 md:p-0 md:px-2 md:py-1.5">
          <div className="flex items-center gap-2 md:contents">
            <span className="shrink-0 md:flex md:w-8 md:items-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(txn.id)}
                className="h-4 w-4 accent-foreground"
                aria-label={`Select transaction: ${txn.description}`}
              />
            </span>
            <span className="shrink-0 text-xs text-muted md:w-20 md:text-sm">
              {new Date(txn.postedDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </span>
            <span
              className="min-w-0 truncate text-xs text-muted md:w-14 md:text-sm"
              title={txn.accountName ?? ""}
            >
              {(() => {
                const last4 = txn.accountLast4 ?? accountLast4(txn.accountName);
                return last4 ? `••${last4}` : txn.accountName;
              })()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 md:contents">
            <span
              className="min-w-0 truncate font-medium md:max-w-[260px] md:flex-1"
              title={txn.description}
            >
              {txn.description}
              {typeLabel && (
                <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-xs font-normal text-muted">
                  {typeLabel}
                </span>
              )}
            </span>
            <span
              className={`shrink-0 whitespace-nowrap text-right font-medium md:ml-4 md:w-24 ${
                txn.amount < 0 ? "text-negative" : "text-positive"
              }`}
            >
              <Money amount={txn.amount} decimalPlaces={decimalPlaces} />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:contents">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 md:w-40 md:flex-none">
              <Select
                form={`txn-${txn.id}`}
                name="category_id"
                uiSize="sm"
                className="min-w-0 flex-1 md:w-full"
                value={categoryId}
                onChange={handleCategoryChange}
                placeholder={isTransfer ? "—" : "Uncategorized"}
                disabled={isTransfer}
              >
                <option value="">Uncategorized</option>
                {!isTransfer && txn.amount > 0 && <option value={INCOME}>Income</option>}
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
            <Select
              form={`txn-${txn.id}`}
              name="source_id"
              uiSize="sm"
              className="min-w-0 flex-1 md:w-40 md:flex-none"
              value={sourceId}
              onChange={handleSourceChange}
              placeholder={isTransfer ? "—" : "No source"}
              disabled={isTransfer}
            >
              <option value="">No source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {!isTransfer && txn.amount > 0 && <option value={ADD_SOURCE}>+ Add source</option>}
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-muted md:contents">
            <span className="md:hidden">Add Rule</span>
            <span className="flex items-center justify-center md:w-20 md:shrink-0">
              <button
                type="button"
                onClick={() => setBuildRule((v) => !v)}
                aria-pressed={buildRule}
                aria-label={
                  buildRule
                    ? "Rule-building on for this row — picking a category will prompt to save a rule"
                    : "Rule-building off for this row"
                }
                title="Prompt to save a rule when this row's category changes"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                  buildRule
                    ? "border-mark bg-mark text-mark-foreground"
                    : "border-border text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <AddIcon size={14} />
              </button>
            </span>
          </div>

          <div className="flex items-center justify-end gap-1 md:contents">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Collapse details" : "Expand details"}
              aria-expanded={expanded}
              className="rounded p-1 text-muted transition-transform duration-150 hover:bg-background md:order-2 md:flex md:w-10 md:items-center md:justify-center"
            >
              <ChevronDownIcon size={14} className={expanded ? "rotate-180" : ""} />
            </button>
            <div className="flex items-center gap-1 md:order-1 md:w-8 md:flex-none md:justify-end">
              {!txn.hasProviderTransactionId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded p-1.5 text-negative hover:bg-background"
                  aria-label="Delete transaction"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>
        </div>

        {rowError && <p className="px-3 pb-2 text-xs text-negative md:px-2">{rowError}</p>}

        {/* Triggered by picking "+ Add source" in the Source select above
            (see ADD_SOURCE) rather than a separate toggle — mirrors the
            create-a-source block on the Sources page (name + type), seeded
            from this transaction's own amount. Same balance-0-then-let-the-
            trigger-apply-it approach as createSource/createManualTransaction:
            inserting at the transaction's amount directly would double it
            once transactions_sync_balance also runs. */}
        {addingSource && (
          <div className="border-t border-border bg-surface-subtle px-4 py-3">
            <form action={createSourceAction} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                New source name
                <input
                  type="text"
                  name="new_source_name"
                  required
                  placeholder="e.g. Bonus"
                  className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Source type
                <Select name="new_source_type" uiSize="sm" className="w-40 py-1 text-xs" defaultValue="past_payment">
                  <option value="past_payment">Past payment</option>
                  <option value="future_repayment">Future repayment</option>
                  <option value="fund">Fund</option>
                </Select>
              </label>
              <button
                type="submit"
                className="w-fit rounded-md border border-border px-3 py-1.5 text-xs hover:bg-background"
              >
                Create source ({formatMoney(txn.amount, decimalPlaces)})
              </button>
              <button
                type="button"
                onClick={() => setAddingSource(false)}
                className="pb-2 text-xs text-muted hover:underline"
              >
                Cancel
              </button>
              {createSourceState?.error && (
                <p className="w-full text-xs text-negative">{createSourceState.error}</p>
              )}
            </form>
          </div>
        )}

        {/* Always rendered (never unmounted) so the form= references from the
            main row's Category/Source selects keep resolving to this form
            regardless of expand state — only the visibility is toggled.
            Nothing submits this form (every field autosaves individually via
            its own onChange/onBlur); it exists purely so saveRow's
            `new FormData(form)` can read the rest of the row's current
            values, including the remotely-associated Category/Source
            fields. */}
        <div className={`border-t border-border bg-surface-subtle px-4 py-3 ${expanded ? "" : "hidden"}`}>
          <form ref={formRef} id={`txn-${txn.id}`} className="flex flex-wrap items-center gap-4">
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={isTransfer}
                onChange={(e) => handleTransferToggle(e.target.checked)}
              />
              <input type="hidden" name="is_transfer" value={isTransfer ? "on" : ""} />
              Transfer
            </label>

            {/* No visible control — Income is picked from the Category
                select instead (see the INCOME sentinel above). This just
                keeps is_income in the persistent form's FormData so other
                autosaves (Notes, Source, Split, ...) don't clear it. */}
            <input type="hidden" name="is_income" value={isIncome ? "on" : ""} />

            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                name="exclude_from_budget"
                defaultChecked={txn.excludeFromBudget}
                onChange={() => saveRow()}
              />
              Exclude
            </label>

            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={splitOpen}
                onChange={(e) => setSplitOpen(e.target.checked)}
              />
              Split{txn.isSplit ? ` (${txn.splits.length})` : ""}
            </label>

            <label className="flex min-w-40 flex-1 items-center gap-1.5 text-xs text-muted">
              <span className="sr-only">Notes</span>
              <input
                type="text"
                name="notes"
                defaultValue={txn.notes ?? ""}
                placeholder="Notes"
                onBlur={() => saveRow()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
          </form>

          {isTransfer && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Transfer from
                <Select
                  form={`txn-${txn.id}`}
                  name="transfer_from"
                  uiSize="sm"
                  className="w-36"
                  defaultValue={currentTransferFrom}
                  onChange={(value) => saveRow({ transfer_from: value })}
                  placeholder="None"
                >
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
                <Select
                  form={`txn-${txn.id}`}
                  name="transfer_to"
                  uiSize="sm"
                  className="w-36"
                  defaultValue={currentTransferTo}
                  onChange={(value) => saveRow({ transfer_to: value })}
                  placeholder="None"
                >
                  <option value="">None</option>
                  {bucketOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          )}

          {txn.isTransfer && (currentTransferFrom || currentTransferTo) && (
            <p className="mt-2 text-xs text-muted">
              Transfer: {formatMoney(Math.abs(txn.amount), decimalPlaces)}{" "}
              {bucketNameByValue[currentTransferFrom] ?? "outside"} &rarr;{" "}
              {bucketNameByValue[currentTransferTo] ?? "outside"}
            </p>
          )}

          {splitOpen && (
            <form action={splitsAction} className="mt-3 flex flex-col gap-2">
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
                      onKeyDown={stepAmountByDollar}
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
              {splitsState?.error && <p className="text-xs text-negative">{splitsState.error}</p>}
            </form>
          )}
        </div>
      </div>
    </>
  );
});

function TrashIcon() {
  return (
    <svg width={16} height={16} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
    </svg>
  );
}
