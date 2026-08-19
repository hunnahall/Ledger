import { createClient } from "@/lib/supabase/server";

export type TransactionFilters = {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  sourceId?: string;
  uncategorizedOnly?: boolean;
};

export async function getFilteredTransactions(filters: TransactionFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*, accounts(account_name), categories(name), sources!source_id(name)")
    .order("posted_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.dateFrom) query = query.gte("posted_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("posted_date", filters.dateTo);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.sourceId) query = query.eq("source_id", filters.sourceId);
  if (filters.uncategorizedOnly) {
    query = query.is("category_id", null).eq("is_transfer", false);
  }

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
  const [{ data: accounts }, { data: budget }, { data: funds }] = await Promise.all([
    supabase.from("accounts").select("id, account_name").order("account_name"),
    supabase.from("budgets").select("id").eq("is_current", true).maybeSingle(),
    supabase.from("funds").select("id, name").is("archived_at", null).order("name"),
  ]);

  let categories: { id: string; name: string }[] = [];
  let defaultSourceId: string | null = null;
  if (budget) {
    const [{ data: categoryData }, { data: budgetSource }] = await Promise.all([
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
    categories = categoryData ?? [];
    defaultSourceId = budgetSource?.id ?? null;
  }

  const { data: sources } = await supabase
    .from("sources")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  return {
    accounts: accounts ?? [],
    categories,
    sources: sources ?? [],
    funds: funds ?? [],
    defaultSourceId,
  };
}
