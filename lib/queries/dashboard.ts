import { createClient } from "@/lib/supabase/server";
import { currentMonthISO } from "@/lib/dates";
import { spentFromRawAmount } from "@/lib/progress";
import { computeDashboardTotals } from "@/lib/dashboard-metrics";
import { getCurrentBudget } from "@/lib/queries/budgets";
import { getSettings } from "@/lib/queries/settings";

export async function getDashboardData() {
  const supabase = await createClient();
  const month = currentMonthISO();

  // Awaited first, not folded into the Promise.all below: it resets the
  // current budget's linked source balance for the month if due, and
  // v_source_balances/v_outflow_by_bucket must see that write.
  const currentBudget = await getCurrentBudget();
  const settings = await getSettings();

  const [
    { data: spending, error: spendingError },
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflowByBucket, error: outflowByBucketError },
    { data: accountBalances, error: accountBalancesError },
    { data: sourceBalances, error: sourceBalancesError },
    { data: reimbursementsPending, error: reimbursementsPendingError },
  ] = await Promise.all([
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase.from("v_inflow_outflow").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_outflow_by_bucket").select("*").eq("month", month),
    supabase.from("v_account_balances").select("*"),
    // v_source_balances already covers every fund (via its linked fund-type
    // Source — see getSourcesWithBalance) as well as every non-fund source,
    // so nothing else needs to be unioned in here; a second `funds` table
    // fetch used to be concatenated on top of this and duplicated every
    // fund on the Dashboard.
    supabase.from("v_source_balances").select("*"),
    supabase.from("v_reimbursements_pending").select("*"),
  ]);

  for (const error of [
    spendingError,
    inflowOutflowError,
    outflowByBucketError,
    accountBalancesError,
    sourceBalancesError,
    reimbursementsPendingError,
  ]) {
    if (error) throw new Error(error.message);
  }

  let categories: { id: string; name: string; monthly_amount: number }[] = [];
  if (currentBudget) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, monthly_amount")
      .eq("budget_id", currentBudget.id)
      .eq("is_excluded", false)
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
      income: inflowOutflow?.income ?? 0,
      otherInflow: inflowOutflow?.other_inflow ?? 0,
      budgetedOutflowRaw,
      otherOutflowRaw,
    }),
    accountBalances: accountBalances ?? [],
    // The Income Fund only does anything while Month Ahead is on (see
    // ensure_income_fund_current) — hidden here the rest of the time to
    // match it being hidden on the Sources page, rather than sitting on
    // the Dashboard permanently at $0.
    sourceBalances: (sourceBalances ?? []).filter(
      (s) => settings.month_ahead || s.type !== "income",
    ),
    reimbursementsPending: reimbursementsPending ?? [],
  };
}
