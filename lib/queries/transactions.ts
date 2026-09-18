import { createClient } from "@/lib/supabase/server";
import { type TransactionFilters } from "@/lib/transactions/filters";

export async function getFilteredTransactions(filters: TransactionFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    // Splits come back embedded rather than as a follow-up `.in(ids)` query.
    // That round trip couldn't start until this one had returned (it needed
    // the ids), and building one filter out of every split transaction's id
    // is what pushed the request URL past Supabase's gateway limit and 400'd
    // the whole page — narrowing the id list to just is_split rows only moved
    // the ceiling. An embed has no URL to outgrow. The CSV export shares this
    // query and ignores the extra key; on a split-less account it costs an
    // empty array per row.
    .select(
      "*, accounts(account_name, last4), categories(name), sources!source_id(name), transaction_splits(id, category_id, source_id, amount)",
    )
    .order("posted_date", { ascending: false })
    .order("created_at", { ascending: false })
    // posted_date/created_at alone don't fully determine an order — rows
    // sharing both (a batch of manual entries, or same-day bank-synced
    // transactions) have no guaranteed relative order from Postgres across
    // separate queries, so editing one could make the list re-fetch in a
    // different order and visibly jump. id never changes, so it's a stable
    // final tiebreaker even though its own ordering is arbitrary.
    .order("id", { ascending: false })
    // Safety cap, not real pagination — the fixed 3-month retention window
    // (purge_expired_data) already keeps normal usage well under this; just
    // guards against an unbounded fetch (3 joined relations) for an outlier
    // account.
    .limit(2000);

  if (filters.dateFrom) query = query.gte("posted_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("posted_date", filters.dateTo);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.sourceId) query = query.eq("source_id", filters.sourceId);
  if (filters.sourceIsNull) query = query.is("source_id", null);
  if (filters.uncategorizedOnly) {
    query = query.is("category_id", null).eq("is_transfer", false);
  }
  if (filters.search) {
    // % and _ are LIKE wildcards; a user searching for "50% off" means the
    // literal characters, not "anything".
    const escaped = filters.search.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.ilike("description", `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
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
    supabase.from("accounts").select("id, account_name").order("account_name"),
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
  const defaultSourceId = (sourceData ?? []).find((s) => s.type === "budget")?.id ?? null;
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
    accounts: accounts ?? [],
    categories,
    sources: orderedSources,
    defaultSourceId,
  };
}
