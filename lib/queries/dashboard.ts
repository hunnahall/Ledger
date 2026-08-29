import { createClient } from "@/lib/supabase/server";
import { currentMonthISO } from "@/lib/dates";
import { spentFromRawAmount } from "@/lib/progress";
import { computeDashboardTotals } from "@/lib/dashboard-metrics";
import { ensureBudgetCurrent } from "@/lib/queries/budgets";
import { getSettings } from "@/lib/queries/settings";

// Source Balances mirrors everything under the Sources page's "Budget"
// heading (budget/sinking_fund/income) plus Reimbursement sources — Float
// gets its own tile and Funds get their own card, so both are left out here.
const SOURCE_BALANCE_TYPES = ["budget", "sinking_fund", "income", "reimbursement"];

export async function getDashboardData() {
  const supabase = await createClient();
  const month = currentMonthISO();

  // Awaited first, not folded into the Promise.all below: it resets the
  // current budget's linked source balance for the month if due, and
  // v_source_balances/v_outflow_by_bucket must see that write.
  const userId = await ensureBudgetCurrent();

  const [
    { data: spending, error: spendingError },
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflowByBucket, error: outflowByBucketError },
    { data: sourceBalances, error: sourceBalancesError },
    settings,
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase.from("v_inflow_outflow").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_outflow_by_bucket").select("*").eq("month", month),
    supabase.from("v_source_balances").select("*"),
    getSettings(),
    userId
      ? supabase
          .from("categories")
          .select("id, name, monthly_amount")
          .eq("user_id", userId)
          .is("archived_at", null)
          .order("sort_order")
      : Promise.resolve({
          data: [] as { id: string; name: string; monthly_amount: number }[],
          error: null,
        }),
  ]);

  for (const error of [
    spendingError,
    inflowOutflowError,
    outflowByBucketError,
    sourceBalancesError,
    categoriesError,
  ]) {
    if (error) throw new Error(error.message);
  }

  const spendingByCategory = new Map(
    (spending ?? []).map((s) => [s.category_id, spentFromRawAmount(s.amount)]),
  );

  const categorySpending = (categories ?? []).map((c) => ({
    ...c,
    spent: spendingByCategory.get(c.id) ?? 0,
  }));

  const budgetedOutflowRaw = outflowByBucket?.find((b) => b.bucket === "budget")?.amount ?? null;
  const otherOutflowRaw = outflowByBucket?.find((b) => b.bucket === "other")?.amount ?? null;

  // The Income Fund only does anything while Month Ahead is on (see
  // ensure_income_fund_current) — hidden here the rest of the time to
  // match it being hidden on the Sources page, rather than sitting on
  // the Dashboard permanently at $0.
  const visibleSourceBalances = (sourceBalances ?? []).filter(
    (s) => settings.month_ahead || s.type !== "income",
  );

  return {
    hasBudget: userId !== null,
    categorySpending,
    ...computeDashboardTotals({
      income: inflowOutflow?.income ?? 0,
      otherInflow: inflowOutflow?.other_inflow ?? 0,
      budgetedOutflowRaw,
      otherOutflowRaw,
    }),
    sourceBalances: visibleSourceBalances.filter(
      (s) => s.type !== null && SOURCE_BALANCE_TYPES.includes(s.type),
    ),
    floatBalance: visibleSourceBalances.find((s) => s.type === "float")?.balance ?? 0,
    funds: visibleSourceBalances
      .filter((s) => s.type === "fund")
      .map((s) => ({ id: s.id, name: s.name, balance: s.balance ?? 0 })),
  };
}
