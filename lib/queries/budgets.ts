import { createClient } from "@/lib/supabase/server";
import { currentMonthISO, monthsRemaining } from "@/lib/dates";
import { computeProgress, spentFromRawAmount } from "@/lib/progress";
import {
  goalMonthlyAmount,
  monthlySinkingAmount,
  type SinkingFrequency,
} from "@/lib/budgets/sinking";

export async function getBudgets() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getCurrentBudget() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(error.message);

  // Resets the current budget's linked source to this month's total
  // budgeted amount (skipped entirely when Month Ahead is on), credits any
  // due Source Transfers, pools every budget's due sinking-expense
  // contributions into the shared Sinking Fund source, and sweeps the
  // shared Income Fund into this budget's linked source — all the first
  // time each is touched that month (no-op once already applied). Every
  // page that displays those balances goes through this function —
  // previously Source Transfers were only applied from the budget's own
  // detail page, so a Source they fund could show stale on /sources until
  // that specific budget page was next visited.
  if (data) {
    const { error: budgetSourceError } = await supabase.rpc("ensure_budget_source_current", {
      p_budget_id: data.id,
    });
    if (budgetSourceError) throw new Error(budgetSourceError.message);

    const { error: transfersError } = await supabase.rpc("ensure_source_transfers_current", {
      p_budget_id: data.id,
    });
    if (transfersError) throw new Error(transfersError.message);

    // Pools every one of the user's budgets' sinking expenses, not just
    // this one — see ensure_sinking_fund_current.
    const { error: sinkingFundError } = await supabase.rpc("ensure_sinking_fund_current", {
      p_user_id: data.user_id,
    });
    if (sinkingFundError) throw new Error(sinkingFundError.message);

    // No-ops unless Month Ahead is on — see ensure_income_fund_current.
    const { error: incomeFundError } = await supabase.rpc("ensure_income_fund_current", {
      p_user_id: data.user_id,
      p_budget_id: data.id,
    });
    if (incomeFundError) throw new Error(incomeFundError.message);
  }

  return data;
}

export async function getBudgetWithCategories(budgetId: string) {
  const supabase = await createClient();
  const month = currentMonthISO();

  // Lazy monthly apply — no real cron, just a catch-up check on whichever
  // budget's page loads next (same reasoning as ensure_budget_source_current
  // above). Awaited on its own before the Promise.all below since a
  // just-applied transfer's balance change should be visible in this same
  // request, not stale until the next load.
  const { error: transferApplyError } = await supabase.rpc("ensure_source_transfers_current", {
    p_budget_id: budgetId,
  });
  if (transferApplyError) throw new Error(transferApplyError.message);

  const [
    { data: budget, error: budgetError },
    { data: categories, error: categoriesError },
    { data: spending, error: spendingError },
    { data: sinkingExpenses, error: sinkingError },
    { data: sourceTransfers, error: sourceTransfersError },
  ] = await Promise.all([
    // maybeSingle (not single): a missing or not-owned budget should
    // resolve to null so the page can render a clean 404, not throw.
    supabase.from("budgets").select("*").eq("id", budgetId).maybeSingle(),
    // Excluded Categories (see Settings) never carry a monthly_amount and
    // don't participate in this page's budgeting math — they live in
    // their own Settings block instead.
    supabase
      .from("categories")
      .select("*")
      .eq("budget_id", budgetId)
      .eq("is_excluded", false)
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase
      .from("sinking_expenses")
      .select("*")
      .eq("budget_id", budgetId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("source_transfers")
      .select("*, sources(name)")
      .eq("budget_id", budgetId)
      .order("created_at", { ascending: true }),
  ]);

  if (budgetError) throw new Error(budgetError.message);
  if (categoriesError) throw new Error(categoriesError.message);
  if (spendingError) throw new Error(spendingError.message);
  if (sinkingError) throw new Error(sinkingError.message);
  if (sourceTransfersError) throw new Error(sourceTransfersError.message);

  const spendingByCategory = new Map(
    (spending ?? []).map((s) => [s.category_id, spentFromRawAmount(s.amount)]),
  );

  const categoriesWithProgress = (categories ?? []).map((category) => ({
    ...category,
    ...computeProgress({
      total: category.monthly_amount,
      spent: spendingByCategory.get(category.id) ?? 0,
    }),
  }));

  const sinkingExpensesWithMonthly = (sinkingExpenses ?? []).map((expense) => ({
    ...expense,
    monthly_amount:
      expense.contribution_type === "goal"
        ? goalMonthlyAmount(
            expense.target_amount ?? 0,
            expense.contributed_to_date,
            monthsRemaining(expense.target_date ?? month, month),
          )
        : monthlySinkingAmount(expense.amount, expense.frequency as SinkingFrequency),
  }));

  const sourceTransfersWithSourceName = (sourceTransfers ?? []).map((transfer) => ({
    ...transfer,
    source_name: (transfer.sources as { name: string } | null)?.name ?? "",
  }));

  return {
    budget,
    categories: categoriesWithProgress,
    sinkingExpenses: sinkingExpensesWithMonthly,
    sourceTransfers: sourceTransfersWithSourceName,
  };
}
