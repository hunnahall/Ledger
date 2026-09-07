"use client";

import { memo, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  assignTransaction,
  bulkUpdateTransactions,
  createSourceFromTransaction,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { UNCATEGORIZED_FILTER_VALUE, NO_SOURCE_FILTER_VALUE } from "@/lib/transactions/filters";
import { SplitEditor } from "@/components/transactions/split-editor";
import { INCOME, useRuleBuilder } from "@/components/transactions/use-rule-builder";
import { formatMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { AddIcon, SplitIcon, SpinnerIcon } from "@/components/ui/icons";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ClearFiltersButton, DateRangeColumnFilter, SelectColumnFilter } from "./column-filter";
import { SearchToggle } from "./search-toggle";
import { Input } from "@/components/ui/input";

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
  // Still read-only here (the "Transfer" badge) — set by match_transfer_pairs
  // during sync, not by anything in this row anymore. No transfer_from/to
  // bucket fields: Source Transfers on the Budgets page own that now.
  isTransfer: boolean;
  isIncome: boolean;
  excludeFromBudget: boolean;
  notes: string | null;
  isSplit: boolean;
  hasProviderTransactionId: boolean;
  splits: { id: string; categoryId: string | null; sourceId: string | null; amount: number }[];
};

type Option = { id: string; name: string };

// A sentinel option in the Category select rather than a separate
// checkbox — always available regardless of which budget's categories
// are currently loaded, since it isn't a real categories row. Picking it
// sets is_income and clears category_id; picking a real category (or
// Uncategorized) clears is_income back out.
// Same idea, in the Source select: picking it doesn't change source_id
// directly — it reveals the inline "create a source from this amount"
// form instead (see addingSource below).
const ADD_SOURCE = "__add_source__";

// Another sentinel option in the same Source select, replacing the Exclude
// checkbox that used to live in the row's (now-removed) expandable detail
// panel. Clears source_id/category_id the same way leaving Budget already
// did; see handleSourceChange. There's no Transfer equivalent — Source
// Transfers on the Budgets page cover that now.
const EXCLUDE_SOURCE = "__exclude__";

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
  categories,
  sources,
  decimalPlaces,
  budgetSourceId,
}: {
  transactions: TransactionRowData[];
  categories: Option[];
  sources: Option[];
  decimalPlaces: number;
  // The reserved Budget-type Source's id — Category only applies to
  // spending tracked against the Budget (see v_spending_by_category, which
  // already scopes to s.type = 'budget'), so the Category select is only
  // enabled on a row whose Source matches this.
  budgetSourceId: string | null;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Which rows have "Add Rule" toggled on — lifted up here (keyed by
  // transaction id) rather than kept as local state inside each row.
  // The list is virtualized (see rowVirtualizer below), so a row scrolled
  // out of view is actually unmounted; local state would silently reset
  // to off the moment it scrolled back in, right before the user picked a
  // category — which looked like the toggle (and the rule it should have
  // built) just not working.
  const [buildRuleIds, setBuildRuleIds] = useState<Set<string>>(new Set());
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
    // Keyed by transaction id rather than the default (array index) — an
    // edit that reorders the list (e.g. changing a row's date moves it to
    // a new index) would otherwise leave the measurement cache mapping the
    // old index's cached height/position onto whatever transaction now
    // sits there, which is what produced the blank-row/overlapping-row
    // glitch on a date change.
    getItemKey: (index) => transactions[index].id,
    estimateSize: () => 48,
    overscan: 10,
    scrollMargin: listEl?.offsetTop ?? 0,
  });

  // Anchor for shift+click range selection — a ref rather than state since
  // it's only read inside the click handler below, never during render.
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Stable identity (via useCallback) so it can be passed straight through
  // to each memoized TransactionRow without defeating memoization — an
  // inline `() => toggleSelect(txn.id)` per row would give every row a
  // fresh callback (and thus force a re-render) on every selection change,
  // which across hundreds of rows is what made clicking a checkbox feel
  // slow.
  const toggleSelect = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      // Capture the anchor before the state update — setSelectedIds's
      // updater runs at render time, not synchronously here, so mutating
      // the ref only after calling it (its old spot) meant the updater
      // sometimes saw the ref already advanced to this same click's index.
      const anchor = lastSelectedIndexRef.current;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && anchor !== null) {
          const start = Math.min(anchor, index);
          const end = Math.max(anchor, index);
          for (let i = start; i <= end; i++) next.add(transactions[i].id);
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastSelectedIndexRef.current = index;
    },
    [transactions],
  );

  const toggleBuildRule = useCallback((id: string) => {
    setBuildRuleIds((prev) => {
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
      // Same rule as a single row's handleSourceChange: a real category only
      // applies while Source is Budget, so moving a batch off it clears
      // whatever categories they were carrying too (Income-marked rows are
      // already category-less, so this is a no-op for them either way).
      const leavingBudget = sourceId !== budgetSourceId;
      startTransition(async () => {
        const result = await bulkUpdateTransactions(ids, {
          sourceId,
          ...(leavingBudget ? { categoryId: null } : {}),
        });
        setBulkError(result?.error ?? null);
      });
    },
    [selectedIds, budgetSourceId],
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
        <Card className="flex flex-col items-center gap-2 text-center text-sm text-muted">
          <span>No transactions match these filters.</span>
          <ClearFiltersButton className="font-medium text-foreground hover:underline" />
        </Card>
      ) : (
        // Below md, each transaction renders as a stacked card instead of a
        // table row — a real <table> forces every column onto one line, which
        // on a phone-width screen either overflows (forcing sideways
        // scrolling to see the amount) or truncates everything unreadably.
        // Rows use the CSS `contents` trick (see TransactionRow) to reflow
        // into a single-line table on wider screens without duplicating any
        // fields, so there's one row layout, not two parallel ones to keep in
        // sync.
        <div className="overflow-hidden rounded-lg border border-border bg-surface text-sm shadow-card">
          <div className="sticky top-0 z-10 hidden items-center gap-1.5 border-b border-border bg-surface-subtle/85 px-2 py-2 text-left text-sm text-muted backdrop-blur md:flex">
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
            <DateRangeColumnFilter label="Date" className="w-28 shrink-0 font-medium" />
            <span className="md:max-w-[260px] md:flex-1 text-left font-medium">Description</span>
            <span className="md:ml-4 w-24 shrink-0 text-center font-medium">Amount</span>
            <SelectColumnFilter
              label="Source"
              paramKey="source_id"
              options={[
                { value: NO_SOURCE_FILTER_VALUE, label: "No source" },
                ...sources.map((s) => ({ value: s.id, label: s.name })),
              ]}
              className="w-40 shrink-0 font-medium"
            />
            <SelectColumnFilter
              label="Category"
              paramKey="category_id"
              options={[
                { value: UNCATEGORIZED_FILTER_VALUE, label: "Uncategorized" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="w-48 shrink-0 font-medium"
            />
            <span className="w-14 shrink-0 text-right font-medium">Rule</span>
            <span className="w-8 shrink-0"></span>
            <span className="flex w-10 shrink-0 items-center justify-center">
              <SearchToggle />
            </span>
            <ClearFiltersButton className="shrink-0 whitespace-nowrap text-xs font-medium normal-case text-muted hover:text-foreground hover:underline" />
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
                    decimalPlaces={decimalPlaces}
                    budgetSourceId={budgetSourceId}
                    index={virtualRow.index}
                    selected={selectedIds.has(txn.id)}
                    onToggleSelect={toggleSelect}
                    selectedCount={selectedIds.size}
                    onBulkApplyCategory={applyBulkCategory}
                    onBulkApplySource={applyBulkSource}
                    buildRule={buildRuleIds.has(txn.id)}
                    onToggleBuildRule={toggleBuildRule}
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
  decimalPlaces,
  budgetSourceId,
  index,
  selected,
  onToggleSelect,
  selectedCount,
  onBulkApplyCategory,
  onBulkApplySource,
  buildRule,
  onToggleBuildRule,
  isLastRow,
}: {
  txn: TransactionRowData;
  categories: Option[];
  sources: Option[];
  decimalPlaces: number;
  budgetSourceId: string | null;
  // This row's position in the (already-filtered/sorted) transactions
  // array — the range endpoint for shift+click select (see toggleSelect).
  index: number;
  selected: boolean;
  onToggleSelect: (id: string, index: number, shiftKey: boolean) => void;
  // How many rows are currently selected app-wide, and callbacks that apply
  // a value to all of them at once — used so that changing this row's own
  // Category/Source select propagates to the rest of the selection instead
  // of just saving this one row (see handleCategoryChange/handleSourceChange).
  selectedCount: number;
  onBulkApplyCategory: (categoryId: string | null) => void;
  onBulkApplySource: (sourceId: string | null) => void;
  // Whether picking a category on this row should go through the
  // learn-a-rule flow (existing-rule lookup, then the "make this a rule?"
  // prompt) — lifted to the parent (see buildRuleIds) rather than kept as
  // local state, since the list is virtualized and local state doesn't
  // survive this row scrolling out of view and back in.
  buildRule: boolean;
  onToggleBuildRule: (id: string) => void;
  // The list is virtualized, so at any moment the DOM's actual last child is
  // whichever row happens to be at the bottom of the rendered window, not
  // necessarily the last transaction — a CSS last:border-0 selector would
  // strip the border off whatever row that happened to be. This is passed
  // down instead so the real last row is the one that loses it.
  isLastRow: boolean;
}) {
  const [isTransfer, setIsTransfer] = useState(txn.isTransfer);
  const [isIncome, setIsIncome] = useState(txn.isIncome);
  const [postedDate, setPostedDate] = useState(txn.postedDate);
  const [excludeFromBudget, setExcludeFromBudget] = useState(txn.excludeFromBudget);
  const [description, setDescription] = useState(txn.description);
  const [notes, setNotes] = useState(txn.notes ?? "");
  const [editingDate, setEditingDate] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(txn.isSplit);
  const [categoryId, setCategoryId] = useState(txn.isIncome ? INCOME : txn.categoryId ?? "");
  const [sourceId, setSourceId] = useState(txn.sourceId ?? "");
  const [addingSource, setAddingSource] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionEditRef = useRef<HTMLInputElement>(null);
  const notesEditRef = useRef<HTMLInputElement>(null);

  // Real categories only apply to Budget-sourced spending — see the Category
  // select below (and its className/options) for what this gates.
  const isBudgetSource = budgetSourceId !== null && sourceId === budgetSourceId;

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
    txn.postedDate !== prevTxn.postedDate ||
    txn.isSplit !== prevTxn.isSplit ||
    txn.excludeFromBudget !== prevTxn.excludeFromBudget ||
    txn.description !== prevTxn.description ||
    txn.notes !== prevTxn.notes
  ) {
    setPrevTxn(txn);
    setIsTransfer(txn.isTransfer);
    setIsIncome(txn.isIncome);
    setCategoryId(txn.isIncome ? INCOME : txn.categoryId ?? "");
    setSourceId(txn.sourceId ?? "");
    setPostedDate(txn.postedDate);
    setDescription(txn.description);
    setNotes(txn.notes ?? "");
    setAddingSource(false);
    setSplitOpen(txn.isSplit);
    // Assigning an Excluded Category (see Settings) forces this true via
    // a DB trigger, server-side, independent of anything submitted here —
    // reconcile it the same way as the other server-driven fields above,
    // not just at mount, so a since-changed value doesn't sit stale in an
    // uncontrolled checkbox and then get silently overwritten back by the
    // next unrelated autosave (Source, ...) reading its DOM state.
    setExcludeFromBudget(txn.excludeFromBudget);
  }

  // Every field in this row autosaves as soon as it changes — there's no
  // longer an explicit Save button (except the Description+Notes editor,
  // which commits both fields together). Reads the rest of the row's
  // current state straight off a small always-mounted <form> (see the
  // hidden-input carrier near the end of this component) via its own
  // FormData — this works even for fields like Category/Source that live
  // outside that <form> tag, since they're associated with it through the
  // form= attribute — and overrides just the field(s) that triggered this
  // save. The override is required for any field backed by a
  // React-controlled hidden input (the Selects, and the is_transfer/
  // exclude_from_budget/notes mirrors) — its onChange fires before React
  // has re-rendered that hidden input with the new value, so reading the
  // DOM alone would still see the stale one.
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

  // "Add Rule": whether this category pick should also teach a vendor rule,
  // and the prompt that asks. See use-rule-builder.ts.
  const { resolveRuleAction, isFreshPick, overridesFor } = useRuleBuilder({
    description: txn.description,
    categories,
    confirm,
  });

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

    const overrides = overridesFor(newCategoryId);

    if (!buildRule) {
      // Build Rule unchecked: assign the category and leave rules alone
      // entirely — assignTransaction learns/reinforces a rule by default
      // whenever category_id is set, so this has to be explicit, not just
      // "don't show the prompt".
      overrides.rule_action = "skip";
    } else if (
      !isTransfer &&
      isFreshPick({
        nowIncome,
        newCategoryId,
        savedIsIncome: txn.isIncome,
        savedCategoryId: txn.categoryId,
      })
    ) {
      const ruleAction = await resolveRuleAction(newCategoryId);
      if (ruleAction) overrides.rule_action = ruleAction;
    }

    await saveRow(overrides);
  }

  // Add Rule can be turned on after a category was already picked, not
  // just before — order shouldn't change the outcome. If this row already
  // carries a category (or Income) when the toggle flips on, offer the
  // same "make this a rule?" prompt for it right now instead of only ever
  // checking at the moment the category itself changes.
  async function handleToggleBuildRule() {
    const turningOn = !buildRule;
    onToggleBuildRule(txn.id);
    if (!turningOn || isTransfer) return;

    const hasTarget = categoryId === INCOME || Boolean(categoryId);
    if (!hasTarget) return;

    const ruleAction = await resolveRuleAction(categoryId);
    if (ruleAction === "skip") return;

    const overrides = overridesFor(categoryId);
    if (ruleAction) overrides.rule_action = ruleAction;
    await saveRow(overrides);
  }

  async function handleSourceChange(newSourceId: string) {
    if (newSourceId === ADD_SOURCE) {
      setAddingSource(true);
      return;
    }

    // Exclude lives as a sentinel option in this same Source select (see
    // EXCLUDE_SOURCE) rather than a separate checkbox — there's no longer a
    // detail panel to put one in. It clears source_id/category_id the same
    // way leaving Budget already did, and doesn't participate in the
    // multi-select bulk-apply below (that stays scoped to picking a real
    // source, same as Income already is for Category).
    //
    // There's no equivalent Transfer option here — Source Transfers on the
    // Budgets page now cover recurring/manual movement between a user's own
    // sources, so marking an individual bank transaction as a transfer is
    // handled entirely by match_transfer_pairs during sync (or by picking
    // "Transfer" on the manual-entry form), never from this row. Whenever
    // isTransfer is true the Source select below is disabled, so this
    // function can never actually be reached with it true.
    if (newSourceId === EXCLUDE_SOURCE) {
      setIsTransfer(false);
      setExcludeFromBudget(true);
      setSourceId("");
      // Income is exempt from Source-driven category clearing everywhere
      // else in this row (see handleSourceChange's real-source branch
      // below) — keep that exemption here too, since the Category select
      // still shows "Income" (just disabled) rather than blank.
      const clearCategory = !isIncome && Boolean(categoryId);
      if (clearCategory) setCategoryId("");
      await saveRow({
        exclude_from_budget: "on",
        is_transfer: "",
        source_id: "",
        ...(clearCategory ? { category_id: "" } : {}),
        rule_action: "skip",
      });
      return;
    }

    const wasExcluded = excludeFromBudget;
    setExcludeFromBudget(false);
    setSourceId(newSourceId);

    // A real category only applies while Source is Budget (see the
    // Category select below) — clear a stale pick when moving off it so
    // the now-hidden dropdown and the saved data agree. Income is
    // normally exempt (its own flag, not gated by Source) — except when
    // Source resets to "No source": that's this row's one way out of
    // Income once picked, since the Category select otherwise only ever
    // offers "Income" (already selected) on any non-Budget Source, with
    // nothing else there to switch to instead.
    const leavingBudget = newSourceId !== budgetSourceId;
    const resettingToNoSource = newSourceId === "";
    const clearIncome = resettingToNoSource && isIncome;
    const clearCategory = (leavingBudget && !isIncome && Boolean(categoryId)) || clearIncome;
    if (clearCategory) setCategoryId("");
    if (clearIncome) setIsIncome(false);

    if (selected && selectedCount > 1) {
      onBulkApplySource(newSourceId || null);
      return;
    }

    // Not a category pick — assignTransaction reinforces/creates a rule by
    // default whenever category_id is present on the save, and it always
    // is here (this row's current one, unrelated to what's actually
    // changing), so this has to opt out explicitly.
    const overrides: Record<string, string> = {
      source_id: newSourceId,
      rule_action: "skip",
    };
    if (wasExcluded) overrides.exclude_from_budget = "";
    if (clearCategory) overrides.category_id = "";
    if (clearIncome) overrides.is_income = "";
    await saveRow(overrides);
  }

  async function handleDateChange(newDate: string) {
    if (!newDate) return;
    setPostedDate(newDate);
    setEditingDate(false);
    // Not a category pick — see handleSourceChange.
    await saveRow({ posted_date: newDate, rule_action: "skip" });
  }

  // Description and Notes commit together via an explicit Save, unlike the
  // rest of the row's autosave-on-change fields — editing free text needs a
  // moment to finish typing before it's worth a round trip, and pairing
  // them means one edit affordance covers both instead of two separate
  // click targets.
  async function handleDescriptionSave() {
    const newDescription = descriptionEditRef.current?.value.trim() ?? "";
    if (!newDescription) {
      setDescError("Description can't be empty.");
      return;
    }
    const newNotes = notesEditRef.current?.value ?? "";
    setDescription(newDescription);
    setNotes(newNotes);
    setDescError(null);
    // Not a category pick — see handleSourceChange.
    await saveRow({ description: newDescription, notes: newNotes, rule_action: "skip" });
    setEditingDescription(false);
  }

  async function handleDelete() {
    const result = await deleteTransaction(txn.id);
    setRowError(result?.error ?? null);
  }

  const typeLabel = isTransfer
    ? "Transfer"
    : txn.excludeFromBudget
      ? "Excluded"
      : isIncome
        ? "Income"
        : null;

  const accountLast4Value = txn.accountLast4 ?? accountLast4(txn.accountName);
  const accountDisplay = accountLast4Value ?? txn.accountName ?? "—";

  // What the Source select currently shows — a real source id, or the
  // Exclude sentinel that replaces the old Exclude checkbox (see
  // handleSourceChange). A transaction the sync auto-flagged as a transfer
  // has no notion here at all: the select is disabled below and shows "—".
  const sourceSelectValue = excludeFromBudget ? EXCLUDE_SOURCE : sourceId;

  const [createSourceState, createSourceAction] = useActionState(
    createSourceFromTransaction.bind(null, txn.id),
    null,
  );

  return (
    <>
      {dialog}
      <div
        className={cn(
          "transition-colors duration-[120ms] ease-standard",
          isLastRow ? "" : "border-b border-border",
          selected ? "bg-accent/8" : "hover:bg-paper-a1",
        )}
      >
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
                // The toggle happens here rather than onChange — a native
                // "change" event doesn't reliably carry modifier keys, but
                // the "click" that precedes it does, and that's what
                // shift+click range-select needs to read.
                onClick={(e) => onToggleSelect(txn.id, index, e.shiftKey)}
                onChange={() => {}}
                className="h-4 w-4 accent-foreground"
                aria-label={`Select transaction: ${txn.description}`}
              />
            </span>
            <span className="shrink-0 px-0.5 text-xs text-muted md:w-28 md:text-sm">
              {editingDate ? (
                <Input
                  uiSize="sm"
                  type="date"
                  autoFocus
                  value={postedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  onBlur={() => setEditingDate(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingDate(false);
                  }}
                  className="w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDate(true)}
                  title={`Account: ${accountDisplay}`}
                  className="w-full rounded-sm px-1 py-0.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                >
                  {formatShortDate(postedDate)}
                </button>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 md:contents">
            {editingDescription ? (
              <div className="flex min-w-0 flex-col gap-1 md:max-w-[280px] md:flex-1">
                <Input
                  ref={descriptionEditRef}
                  type="text"
                  defaultValue={description}
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleDescriptionSave();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingDescription(false);
                      setDescError(null);
                    }
                  }}
                  uiSize="sm"
                  className="w-full"
                />
                <div className="flex items-center gap-1.5">
                  <Input
                    ref={notesEditRef}
                    type="text"
                    defaultValue={notes}
                    placeholder="Notes"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleDescriptionSave();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingDescription(false);
                        setDescError(null);
                      }
                    }}
                    uiSize="sm"
                    className="w-full"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="shrink-0 px-2 py-1 text-xs"
                    onClick={handleDescriptionSave}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 px-2 py-1 text-xs"
                    onClick={() => {
                      setEditingDescription(false);
                      setDescError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {descError && <p className="text-xs text-negative">{descError}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDescription(true)}
                title={notes ? `${description} — ${notes}` : description}
                className="min-w-0 truncate rounded-sm px-1 text-left font-medium transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 md:max-w-[260px] md:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                {description}
                {typeLabel && (
                  <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-xs font-normal text-muted">
                    {typeLabel}
                  </span>
                )}
              </button>
            )}
            <span
              className={`shrink-0 whitespace-nowrap font-medium md:ml-4 md:w-24 md:text-center ${
                txn.amount < 0 ? "text-negative" : "text-positive"
              }`}
            >
              <Money amount={txn.amount} decimalPlaces={decimalPlaces} />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:contents">
            {/* Disabled while isTransfer — a transfer's source_id stays
                null (transactions_sync_transfer_balance applies its amount
                via transfer_from/to_source_id instead), and there's no
                Transfer option here to switch into or out of: Source
                Transfers on the Budgets page own that now, so a bank
                transaction only ever becomes one via match_transfer_pairs
                during sync or the manual-entry form's own Transfer type. */}
            <Select
              form={`txn-${txn.id}`}
              name="source_id"
              uiSize="sm"
              className="min-w-0 flex-1 md:w-40 md:flex-none"
              value={sourceSelectValue}
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
              <option value={EXCLUDE_SOURCE}>Exclude</option>
              {!isTransfer && !excludeFromBudget && txn.amount > 0 && (
                <option value={ADD_SOURCE}>+ Add source</option>
              )}
            </Select>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 md:w-48 md:flex-none">
              <Select
                form={`txn-${txn.id}`}
                name="category_id"
                uiSize="sm"
                // Real categories only apply to Budget-sourced spending (see
                // v_spending_by_category, scoped to s.type = 'budget'), so
                // this reads as inert on any other Source — shaded the same
                // as the table header (bg-surface-subtle) rather than left
                // looking like a normal, pickable field. The one exception
                // is Income, which is its own flag with its own
                // Source-routing (see handleCategoryChange/
                // route_income_to_fund) and stays available — and normal-
                // looking — no matter what this row's Source is. Transfer
                // and Excluded (see EXCLUDE_SOURCE) both disable it outright,
                // per the same "grayed out" treatment a non-budget source
                // already gets.
                className={`min-w-0 flex-1 md:w-full ${!isBudgetSource && !isIncome ? "bg-surface-subtle" : ""}`}
                value={categoryId}
                onChange={handleCategoryChange}
                placeholder={isTransfer ? "—" : isBudgetSource ? "Uncategorized" : "—"}
                disabled={isTransfer || excludeFromBudget}
              >
                {(isBudgetSource || isIncome) && <option value="">Uncategorized</option>}
                {!isTransfer && txn.amount > 0 && <option value={INCOME}>Income</option>}
                {isBudgetSource &&
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              {(isBudgetSource || isIncome) && txn.categorySource === "rule" && (
                <span
                  className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[0.65rem] text-muted"
                  title="Auto-categorized from a learned rule"
                >
                  auto
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-muted md:contents">
            <span className="md:hidden">Add Rule</span>
            <span className="flex items-center justify-end md:w-14 md:shrink-0">
              <button
                type="button"
                onClick={handleToggleBuildRule}
                aria-pressed={buildRule}
                aria-label={
                  buildRule
                    ? "Rule-building on for this row — picking a category will prompt to save a rule"
                    : "Rule-building off for this row"
                }
                title="Prompt to save a rule when this row's category changes"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-[120ms] ease-standard ${
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
              onClick={() => setSplitOpen((s) => !s)}
              aria-pressed={splitOpen}
              aria-label={splitOpen ? "Hide split" : "Split this transaction"}
              title="Split into multiple categories/sources"
              className={`rounded-sm p-1 transition-colors duration-[120ms] ease-standard md:order-2 md:flex md:w-10 md:items-center md:justify-center ${
                splitOpen ? "text-accent" : "text-muted hover:bg-paper-a2 hover:text-foreground"
              }`}
            >
              <SplitIcon size={14} />
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
                <Input
                  uiSize="sm"
                  type="text"
                  name="new_source_name"
                  required
                  placeholder="e.g. Bonus"
                  className="w-40"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Source type
                <Select name="new_source_type" uiSize="sm" className="w-40 py-1 text-xs" defaultValue="reimbursement">
                  <option value="reimbursement">Reimbursement</option>
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

        {/* The Split button above toggles this — no more caret/detail row,
            so this is the transaction's own split-editing surface, not a
            generic "show more" panel. */}
        {splitOpen && (
          <div className="border-t border-border bg-surface-subtle px-4 py-3">
            <SplitEditor
              transactionId={txn.id}
              transactionAmount={txn.amount}
              splits={txn.splits}
              categories={categories}
              sources={sources}
              decimalPlaces={decimalPlaces}
            />
          </div>
        )}

        {/* Pure FormData carrier for saveRow — never shown, never submitted
            directly. Holds exactly the fields assignTransaction always
            writes unconditionally (is_transfer, is_income,
            exclude_from_budget, notes), so an autosave triggered by some
            other field (Date, Source, Rule, ...) always resubmits their
            current values instead of a stale/blank one. Every other field
            (Category, Source) associates with this same form via its own
            form= attribute regardless of where it sits in the tree. */}
        <form ref={formRef} id={`txn-${txn.id}`}>
          <input type="hidden" name="is_transfer" value={isTransfer ? "on" : ""} />
          <input type="hidden" name="is_income" value={isIncome ? "on" : ""} />
          <input type="hidden" name="exclude_from_budget" value={excludeFromBudget ? "on" : ""} />
          <input type="hidden" name="notes" value={notes} />
        </form>
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
