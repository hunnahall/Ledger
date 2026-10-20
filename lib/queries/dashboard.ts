import { createClient } from "@/lib/supabase/server";
import { spentFromRawAmount } from "@/lib/progress";
import { computeDashboardTotals } from "@/lib/dashboard-metrics";
import { ensureBudgetCurrent, getSinkingAndTransferMonthlyTotal } from "@/lib/queries/budgets";
import { nextMonthISO } from "@/lib/dates";
import { getLegs } from "@/lib/queries/legs";

// The category Transfers tags Sinking Fund contributions and Source
// Transfers (see the Transactions page) — its own monthly_amount is a
// placeholder $0 (categories aren't specific to Sinking/Source Transfer
// money), so its Dashboard denominator is swapped for the actual combined
// monthly commitment from the Budget page instead. Matched by name since
// categories have no "this one is special" marker (see sources.is_system
// for the analogous thing sources do have).
const TRANSFERS_CATEGORY_NAME = "Transfers";

export async function getDashboardData(monthISO: string) {
  const supabase = await createClient();
  const month = monthISO;

  // Awaited first, not folded into the Promise.all below: it resets the
  // current budget's linked source balance for the month if due, and
  // v_source_balances/v_outflows must see that write.
  const userId = await ensureBudgetCurrent();

  const [
    { data: spending, error: spendingError },
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflows, error: outflowsError },
    { data: sourceBalances, error: sourceBalancesError },
    legs,
    { data: budgetCategoryIncome, error: budgetCategoryIncomeError },
    { data: categories, error: categoriesError },
    transfersMonthlyTotal,
    nextTransfersMonthlyTotal,
  ] = await Promise.all([
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase.from("v_inflow_outflow").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_outflows").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_source_balances").select("*"),
    // Gross spending per source for Source Allocation comes from the same
    // legs the views count: negative amounts only, so money coming into a
    // source never offsets its spending and the slices sum to outflows.
    getLegs(supabase, month, nextMonthISO(month)),
    supabase.from("v_budget_category_income").select("*").eq("month", month).maybeSingle(),
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
    userId ? getSinkingAndTransferMonthlyTotal(userId, month) : Promise.resolve(0),
    // Next month's sinking + transfer commitment, for Budget Funding under
    // Month Ahead (this month's income funds next month's allocation).
    userId ? getSinkingAndTransferMonthlyTotal(userId, nextMonthISO(month)) : Promise.resolve(0),
  ]);

  for (const error of [
    spendingError,
    inflowOutflowError,
    outflowsError,
    sourceBalancesError,
    budgetCategoryIncomeError,
    categoriesError,
  ]) {
    if (error) throw new Error(error.message);
  }

  const spendingByCategory = new Map(
    (spending ?? []).map((s) => [s.category_id, spentFromRawAmount(s.amount)]),
  );

  const categorySpending = (categories ?? []).map((c) => ({
    ...c,
    monthly_amount: c.name === TRANSFERS_CATEGORY_NAME ? transfersMonthlyTotal : c.monthly_amount,
    spent: spendingByCategory.get(c.id) ?? 0,
  }));

  // Same calc as getBudgetRateData's allocation (lib/queries/budgets.ts)
  // — categories here already carries every category's raw monthly_amount,
  // Transfers' own $0 placeholder included, so adding transfersMonthlyTotal
  // (the same getSinkingAndTransferMonthlyTotal call that function makes)
  // reaches the identical figure without a second query for it.
  const categoriesTotal = (categories ?? []).reduce((sum, c) => sum + c.monthly_amount, 0);
  const allocation = categoriesTotal + transfersMonthlyTotal;
  // Category amounts carry no per-month history, so next month's categories
  // are today's; only sinking goal contributions can differ by month.
  const nextMonthAllocation = categoriesTotal + nextTransfersMonthlyTotal;

  const expenseRaw = outflows?.expense ?? null;
  const otherOutflowsRaw = outflows?.other_outflows ?? null;

  // The Income source is used whether Month Ahead is on or off (income always
  // tracks to it), so nothing is hidden here any more.
  const visibleSourceBalances = sourceBalances ?? [];

  const spentBySourceId = new Map<string, number>();
  for (const leg of legs) {
    if (!leg.sourceId || leg.amount >= 0) continue;
    spentBySourceId.set(leg.sourceId, (spentBySourceId.get(leg.sourceId) ?? 0) - leg.amount);
  }

  return {
    hasBudget: userId !== null,
    categorySpending,
    ...computeDashboardTotals({
      income: inflowOutflow?.income ?? 0,
      otherInflows: inflowOutflow?.other_inflows ?? 0,
      expenseRaw,
      otherOutflowsRaw,
      categorizedIncome: budgetCategoryIncome?.amount ?? 0,
      allocation,
    }),
    // Every (non-archived) source, so Source Allocation can list them all;
    // ones with no spending this month show as $0.
    sourceOutflows: visibleSourceBalances
      .filter((s): s is typeof s & { id: string; name: string } => s.id !== null && s.name !== null)
      .map((s) => ({ id: s.id, name: s.name, spent: spentBySourceId.get(s.id) ?? 0 })),
    nextMonthAllocation,
    floatBalance: visibleSourceBalances.find((s) => s.type === "float")?.balance ?? 0,
  };
}

// Last 4 Months: per-month totals from the same views (and the same
// computeDashboardTotals) the current-month figures use, so a month's column
// always matches what the Dashboard shows when that month is selected.
// Allocation history isn't stored — categories/sinking/transfer amounts are
// current values only — so the caller fills in allocation with one
// figure for every month; a month whose budget differed shows today's
// budget, not the one it had.
export async function getMonthlyTrend(months: string[]) {
  const supabase = await createClient();
  const [
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflows, error: outflowsError },
    { data: saved, error: savedError },
  ] = await Promise.all([
    supabase.from("v_inflow_outflow").select("*").in("month", months),
    supabase.from("v_outflows").select("*").in("month", months),
    supabase.from("monthly_totals").select("month, amount").eq("kind", "allocation").in("month", months),
  ]);
  if (inflowOutflowError) throw new Error(inflowOutflowError.message);
  if (outflowsError) throw new Error(outflowsError.message);
  if (savedError) throw new Error(savedError.message);

  // The allocation each month had when it started (monthly_totals); months
  // saved before that table existed have none and the caller falls back to
  // today's allocation.
  const savedAllocations = new Map((saved ?? []).map((r) => [r.month, r.amount]));

  const trend = [...months].sort().map((month) => {
    const io = inflowOutflow?.find((r) => r.month === month);
    const out = outflows?.find((r) => r.month === month);
    const totals = computeDashboardTotals({
      income: io?.income ?? 0,
      otherInflows: io?.other_inflows ?? 0,
      expenseRaw: out?.expense ?? null,
      otherOutflowsRaw: out?.other_outflows ?? null,
      categorizedIncome: 0,
      allocation: 0,
    });
    return {
      month,
      income: totals.income,
      inflows: totals.inflows,
      expense: totals.expense,
      outflows: totals.outflows,
    };
  });
  return { trend, savedAllocations };
}
