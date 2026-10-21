import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { currentMonthISO } from "@/lib/dates";
import { getSettings } from "@/lib/queries/settings";
import { searchOrFilter, type TransactionFilters } from "@/lib/transactions/filters";
import { buildSplitGroups } from "@/lib/transactions/splits";

export async function getFilteredTransactions(filters: TransactionFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*, accounts(account_name, last4), categories(name), sources!source_id(name)")
    // A split original isn't listed: its pieces are.
    .eq("is_split", false)
    .order("posted_date", { ascending: false })
    .order("created_at", { ascending: false })
    // posted_date/created_at alone don't fully determine an order — rows
    // sharing both (a batch of manual entries, or same-day bank-synced
    // transactions) have no guaranteed relative order from Postgres across
    // separate queries, so editing one could make the list re-fetch in a
    // different order and visibly jump. id never changes, so it's a stable
    // final tiebreaker even though its own ordering is arbitrary.
    .order("id", { ascending: false })
    // Safety cap, not real pagination — the 4-month retention window
    // (purge_expired_data) already keeps normal usage well under this; just
    // guards against an unbounded fetch (3 joined relations) for an outlier
    // account.
    .limit(2000);

  if (filters.dateFrom) query = query.gte("posted_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("posted_date", filters.dateTo);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.sourceId) query = query.eq("source_id", filters.sourceId);
  // source_id is also null for an Excluded row (see EXCLUDE_SOURCE in
  // transaction-list.tsx), which shows as Exclude, not "No source", in its
  // own Source select. Income rows always carry the Income source (see
  // route_income_to_source); is_income stays in the filter as a guard.
  // Transfers never take a Source (picking one ends the transfer), so they
  // aren't waiting for one either. Keep in step with getUnsourcedCount below
  // and needsSource.
  if (filters.sourceIsNull) {
    query = query
      .is("source_id", null)
      .eq("exclude_from_budget", false)
      .eq("is_income", false)
      .eq("is_transfer", false);
  }
  if (filters.uncategorizedOnly) {
    // Only Budget money (or money with no Source) can carry a Category (see
    // transactions_tidy), so a row on any other Source isn't waiting for
    // one. Excluded rows never take a Category either.
    const { data: budgetSource, error: budgetError } = await supabase
      .from("sources")
      .select("id")
      .eq("type", "budget")
      .maybeSingle();
    if (budgetError) throw new Error(budgetError.message);
    query = query
      .is("category_id", null)
      .eq("is_transfer", false)
      .eq("exclude_from_budget", false)
      .or(budgetSource ? `source_id.is.null,source_id.eq.${budgetSource.id}` : "source_id.is.null");
  }
  const search = filters.search?.trim();
  if (search) {
    // Any field: description, notes, merchant, the amount (when the term is
    // a number), and the Category or Source name. Names resolve to ids first
    // so the one or() filter can cover them.
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const [{ data: categoryMatches, error: categoryError }, { data: sourceMatches, error: sourceError }] =
      await Promise.all([
        supabase.from("categories").select("id").ilike("name", like),
        supabase.from("sources").select("id").ilike("name", like),
      ]);
    if (categoryError) throw new Error(categoryError.message);
    if (sourceError) throw new Error(sourceError.message);
    query = query.or(
      searchOrFilter(search, {
        categoryIds: (categoryMatches ?? []).map((c) => c.id),
        sourceIds: (sourceMatches ?? []).map((s) => s.id),
      }),
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// Every split, keyed by its original: the original's amount and its pieces
// in order. Splits are rare, so this is one small read rather than an embed
// on the main list (a piece's original is never listed itself).
export async function getSplitGroups() {
  const supabase = await createClient();
  const [{ data: pieces, error: piecesError }, { data: originals, error: originalsError }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, notes, source_id, category_id, exclude_from_budget, split_parent_id")
      .not("split_parent_id", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("transactions").select("id, amount").eq("is_split", true),
  ]);
  if (piecesError) throw new Error(piecesError.message);
  if (originalsError) throw new Error(originalsError.message);
  const originalAmount = new Map((originals ?? []).map((o) => [o.id, o.amount]));
  return buildSplitGroups(
    (pieces ?? []).map((r) => ({
      id: r.id,
      parentId: r.split_parent_id as string,
      parentAmount: originalAmount.get(r.split_parent_id as string) ?? 0,
      amount: r.amount,
      sourceId: r.source_id,
      categoryId: r.category_id,
      excluded: r.exclude_from_budget,
      notes: r.notes,
    })),
  );
}

// Feeds the Transactions page's spending-by-day chart. Deliberately ignores
// the list's filters (clicking a day filters the list to it, and the chart
// has to stay put so that click can be undone), so it's a lean read of the
// rows outflows counts: no transfers, no Excluded rows, no split originals.
export async function getSpendingRows() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("posted_date, amount, is_income, category_id, source_id, sources!source_id(type)")
    .eq("is_transfer", false)
    .eq("exclude_from_budget", false)
    .eq("is_split", false)
    .lt("amount", 0)
    .order("posted_date", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    postedDate: r.posted_date,
    amount: r.amount,
    isIncome: r.is_income,
    categoryId: r.category_id,
    sourceId: r.source_id,
    sourceType: (r.sources as { type: string } | null)?.type ?? null,
  }));
}

export async function getFilterOptions() {
  const supabase = await createClient();
  // One `sources` read covering both uses. The reserved Budget-type Source —
  // every user has exactly one — used to be a separate `.eq("type","budget")`
  // round trip whose only output was an id, and because the list query needed
  // that id for its ordering it was written *after* the Promise.all, so the
  // two ran in series. Selecting `type` and `archived_at` alongside the rest
  // answers both questions from one response: the Budget source is matched
  // regardless of archived_at (as the dedicated query was), while the
  // selectable list still excludes archived rows.
  const [
    { data: accounts, error: accountsError },
    { data: categoryData, error: categoryDataError },
    { data: sourceData, error: sourcesError },
  ] = await Promise.all([
    supabase.from("accounts").select("id, account_name, is_manual").order("account_name"),
    supabase
      .from("categories")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
    supabase.from("sources").select("id, name, type, archived_at").order("name"),
  ]);
  for (const error of [accountsError, categoryDataError, sourcesError]) {
    if (error) throw new Error(error.message);
  }

  const categories = categoryData ?? [];
  // The manual-entry form no longer shows an Account picker — it silently
  // files under whichever account was created for that purpose (is_manual;
  // see the Accounts page). Falling back to the first account by name keeps
  // a brand-new user (no manual account yet) submitting something valid
  // instead of failing account_id's NOT NULL constraint, same as the old
  // select's implicit "first option" default when the field went untouched.
  const defaultAccountId =
    (accounts ?? []).find((a) => a.is_manual)?.id ?? (accounts ?? [])[0]?.id ?? null;
  const defaultSourceId = (sourceData ?? []).find((s) => s.type === "budget")?.id ?? null;
  // The system Income source. Picking it in a Source select is how a row is
  // marked Income (route_income_to_source keeps is_income and this source in
  // lockstep), so the selects need to recognize it.
  const incomeSourceId = (sourceData ?? []).find((s) => s.type === "income")?.id ?? null;
  const sources = (sourceData ?? [])
    .filter((s) => s.archived_at === null)
    .map((s) => ({ id: s.id, name: s.name }));

  // The current budget's own Source (e.g. "Budget") is what most
  // transactions actually get assigned to, so it leads the list instead of
  // just falling wherever it lands alphabetically — everything else stays
  // alphabetical behind it.
  const orderedSources = defaultSourceId
    ? [
        ...sources.filter((s) => s.id === defaultSourceId),
        ...sources.filter((s) => s.id !== defaultSourceId),
      ]
    : sources;

  return {
    categories,
    sources: orderedSources,
    defaultSourceId,
    incomeSourceId,
    defaultAccountId,
  };
}

// How many transactions still need a Source: the nav badge on Transactions.
// Same rule as the "No source" filter above (and needsSource), split
// originals left out since their pieces are what's listed. Only the current
// month counts (in the user's time zone); the "No source" filter still lists
// every kept month.
export const getUnsourcedCount = cache(async function getUnsourcedCount(): Promise<number> {
  const supabase = await createClient();
  const settings = await getSettings();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .gte("posted_date", currentMonthISO(settings.timezone))
    .is("source_id", null)
    .eq("exclude_from_budget", false)
    .eq("is_income", false)
    .eq("is_transfer", false)
    .eq("is_split", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
});

// Each transfer's copy: original transaction id -> the Source it was booked
// to. The Transactions list shows it as "Transfer to <Source>" on the original.
export async function getTransferDestinations(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("transfer_of, source_id")
    .not("transfer_of", "is", null);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.transfer_of && r.source_id) map.set(r.transfer_of, r.source_id);
  }
  return map;
}
