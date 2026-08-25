import { createClient } from "@/lib/supabase/server";
import { type TransactionFilters } from "@/lib/transactions/filters";

export {
  UNCATEGORIZED_FILTER_VALUE,
  resolveCategoryFilter,
  NO_SOURCE_FILTER_VALUE,
  resolveSourceFilter,
  type TransactionFilters,
} from "@/lib/transactions/filters";

export async function getFilteredTransactions(filters: TransactionFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*, accounts(account_name, last4), categories(name), sources!source_id(name)")
    .order("posted_date", { ascending: false })
    .order("created_at", { ascending: false })
    // posted_date/created_at alone don't fully determine an order — rows
    // sharing both (a batch of manual entries, or same-day bank-synced
    // transactions) have no guaranteed relative order from Postgres across
    // separate queries, so editing one could make the list re-fetch in a
    // different order and visibly jump. id never changes, so it's a stable
    // final tiebreaker even though its own ordering is arbitrary.
    .order("id", { ascending: false })
    // Safety cap, not real pagination — retention_days (60/120 max) already
    // keeps normal usage well under this; just guards against an unbounded
    // fetch (3 joined relations) for an outlier account.
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
  if (filters.search) query = query.ilike("description", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getTransactionSplits(transactionIds: string[]) {
  if (transactionIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transaction_splits")
    .select("*")
    .in("transaction_id", transactionIds);
  if (error) throw new Error(error.message);
  return data;
}

export async function getFilterOptions() {
  const supabase = await createClient();
  const [
    { data: accounts, error: accountsError },
    { data: budget, error: budgetError },
    { data: funds, error: fundsError },
  ] = await Promise.all([
    supabase.from("accounts").select("id, account_name").order("account_name"),
    supabase.from("budgets").select("id").maybeSingle(),
    supabase.from("funds").select("id, name").is("archived_at", null).order("name"),
  ]);
  for (const error of [accountsError, budgetError, fundsError]) {
    if (error) throw new Error(error.message);
  }

  let categories: { id: string; name: string }[] = [];
  let defaultSourceId: string | null = null;
  if (budget) {
    const [
      { data: categoryData, error: categoryDataError },
      { data: budgetSource, error: budgetSourceError },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("budget_id", budget.id)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("sources")
        .select("id")
        .eq("budget_id", budget.id)
        .eq("type", "budget")
        .maybeSingle(),
    ]);
    if (categoryDataError) throw new Error(categoryDataError.message);
    if (budgetSourceError) throw new Error(budgetSourceError.message);
    categories = categoryData ?? [];
    defaultSourceId = budgetSource?.id ?? null;
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (sourcesError) throw new Error(sourcesError.message);

  // The current budget's own Source (e.g. "Monthly") is what most
  // transactions actually get assigned to, so it leads the list instead of
  // just falling wherever it lands alphabetically — everything else stays
  // alphabetical behind it.
  const orderedSources = defaultSourceId
    ? [
        ...(sources ?? []).filter((s) => s.id === defaultSourceId),
        ...(sources ?? []).filter((s) => s.id !== defaultSourceId),
      ]
    : (sources ?? []);

  return {
    accounts: accounts ?? [],
    categories,
    sources: orderedSources,
    funds: funds ?? [],
    defaultSourceId,
  };
}
