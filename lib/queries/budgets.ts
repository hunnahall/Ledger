import { createClient } from "@/lib/supabase/server";
import { currentMonthISO, monthsRemaining } from "@/lib/dates";
import { computeProgress, spentFromRawAmount } from "@/lib/progress";
import {
  goalMonthlyAmount,
  monthlySinkingAmount,
  type SinkingFrequency,
} from "@/lib/budgets/sinking";

// Every user has exactly one budget bucket — the reserved `budget`-type
// Source, always named "Monthly", auto-provisioned at signup (see
// handle_new_user). Resets its balance to this month's total budgeted
// amount (skipped entirely when Month Ahead is on), credits any due Source
// Transfers, pools due sinking-expense contributions into the shared
// Sinking Fund source, and sweeps the shared Income Fund into the budget
// source — all the first time each is touched that month (no-op once
// already applied). Every page that displays those balances calls this
// first. Returns the user id (for callers that need it) or null if
// unauthenticated.
export async function ensureBudgetCurrent(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { error: budgetSourceError } = await supabase.rpc("ensure_budget_source_current", {
    p_user_id: user.id,
  });
  if (budgetSourceError) throw new Error(budgetSourceError.message);

  // Independent of each other (source transfers vs. sinking-fund pooling
  // touch unrelated sources), so run them concurrently rather than one
  // full round trip after another.
  const [{ error: transfersError }, { error: sinkingFundError }] = await Promise.all([
    supabase.rpc("ensure_source_transfers_current", { p_user_id: user.id }),
    supabase.rpc("ensure_sinking_fund_current", { p_user_id: user.id }),
  ]);
  if (transfersError) throw new Error(transfersError.message);
  if (sinkingFundError) throw new Error(sinkingFundError.message);

  // Sweeps into the source ensure_budget_source_current just reset above —
  // must stay after it, not folded into the Promise.all. No-ops unless
  // Month Ahead is on — see ensure_income_fund_current.
  const { error: incomeFundError } = await supabase.rpc("ensure_income_fund_current", {
    p_user_id: user.id,
  });
  if (incomeFundError) throw new Error(incomeFundError.message);

  return user.id;
}

export async function getBudgetData() {
  const supabase = await createClient();
  const month = currentMonthISO();

  // Awaited first, not folded into the Promise.all below: it resets
  // balances for the month if due, and the selects below must see that
  // write.
  const userId = await ensureBudgetCurrent();
  if (!userId) return null;

  const [
    { data: categories, error: categoriesError },
    { data: spending, error: spendingError },
    { data: sinkingExpenses, error: sinkingError },
    { data: sourceTransfers, error: sourceTransfersError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase
      .from("sinking_expenses")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("source_transfers")
      .select("*, sources(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

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
    categories: categoriesWithProgress,
    sinkingExpenses: sinkingExpensesWithMonthly,
    sourceTransfers: sourceTransfersWithSourceName,
  };
}
