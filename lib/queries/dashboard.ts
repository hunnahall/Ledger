import { createClient } from "@/lib/supabase/server";
import { currentMonthISO } from "@/lib/dates";
import { spentFromRawAmount } from "@/lib/progress";
import { computeDashboardTotals } from "@/lib/dashboard-metrics";
import { getCurrentBudget } from "@/lib/queries/budgets";

export async function getDashboardData() {
  const supabase = await createClient();
  const month = currentMonthISO();

  // Awaited first, not folded into the Promise.all below: it resets the
  // current budget's linked source balance for the month if due, and
  // v_source_balances/v_outflow_by_bucket must see that write.
  const currentBudget = await getCurrentBudget();

  const [
    { data: spending, error: spendingError },
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflowByBucket, error: outflowByBucketError },
    { data: accountBalances, error: accountBalancesError },
    { data: sourceBalances, error: sourceBalancesError },
    { data: reimbursementsPending, error: reimbursementsPendingError },
    { data: funds, error: fundsError },
  ] = await Promise.all([
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase.from("v_inflow_outflow").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_outflow_by_bucket").select("*").eq("month", month),
    supabase.from("v_account_balances").select("*"),
    supabase.from("v_source_balances").select("*"),
    supabase.from("v_reimbursements_pending").select("*"),
    supabase.from("funds").select("id, name, balance").is("archived_at", null).order("name"),
  ]);

  for (const error of [
    spendingError,
    inflowOutflowError,
    outflowByBucketError,
    accountBalancesError,
    sourceBalancesError,
    reimbursementsPendingError,
    fundsError,
  ]) {
    if (error) throw new Error(error.message);
  }

  let categories: { id: string; name: string; monthly_amount: number }[] = [];
  if (currentBudget) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, monthly_amount")
      .eq("budget_id", currentBudget.id)
      .is("archived_at", null)
      .order("sort_order");
    if (error) throw new Error(error.message);
    categories = data ?? [];
  }

  const spendingByCategory = new Map(
    (spending ?? []).map((s) => [s.category_id, spentFromRawAmount(s.amount)]),
  );

  const categorySpending = categories.map((c) => ({
    ...c,
    spent: spendingByCategory.get(c.id) ?? 0,
  }));

  const budgetedOutflowRaw = outflowByBucket?.find((b) => b.bucket === "budget")?.amount ?? null;
  const otherOutflowRaw = outflowByBucket?.find((b) => b.bucket === "other")?.amount ?? null;

  return {
    currentBudget,
    categorySpending,
    ...computeDashboardTotals({
      inflow: inflowOutflow?.inflow ?? 0,
      budgetedOutflowRaw,
      otherOutflowRaw,
    }),
    accountBalances: accountBalances ?? [],
    sourceBalances: [...(sourceBalances ?? []), ...(funds ?? [])],
    reimbursementsPending: reimbursementsPending ?? [],
  };
}
