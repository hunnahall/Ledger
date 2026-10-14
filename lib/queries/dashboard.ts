import { createClient } from "@/lib/supabase/server";
import { spentFromRawAmount } from "@/lib/progress";
import { computeDashboardTotals } from "@/lib/dashboard-metrics";
import { ensureBudgetCurrent, getSinkingAndTransferMonthlyTotal } from "@/lib/queries/budgets";
import { nextMonthISO } from "@/lib/dates";

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
  // v_source_balances/v_outflow_by_bucket must see that write.
  const userId = await ensureBudgetCurrent();

  const [
    { data: spending, error: spendingError },
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflowByBucket, error: outflowByBucketError },
    { data: sourceBalances, error: sourceBalancesError },
    { data: plainOutflows, error: plainOutflowsError },
    { data: splitOutflows, error: splitOutflowsError },
    { data: budgetCategoryIncome, error: budgetCategoryIncomeError },
    { data: categories, error: categoriesError },
    transfersMonthlyTotal,
  ] = await Promise.all([
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase.from("v_inflow_outflow").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_outflow_by_bucket").select("*").eq("month", month),
    supabase.from("v_source_balances").select("*"),
    // Gross spending per source for Source Allocation: negative amounts
    // only, so money coming into a source never offsets its spending and the
    // slices sum to outflows. (v_spending_by_source is net per source and
    // can go positive, so it can't back a pie.) Same rows v_outflow_by_bucket
    // counts: non-split transactions plus split legs, transfers and Excluded
    // left out, unsourced dropped.
    supabase
      .from("transactions")
      .select("source_id, amount")
      .gte("posted_date", month)
      .lt("posted_date", nextMonthISO(month))
      .eq("is_transfer", false)
      .eq("exclude_from_budget", false)
      .eq("is_split", false)
      .lt("amount", 0)
      .not("source_id", "is", null),
    supabase
      .from("transaction_splits")
      .select("source_id, amount, transactions!inner(posted_date, is_transfer, exclude_from_budget)")
      .gte("transactions.posted_date", month)
      .lt("transactions.posted_date", nextMonthISO(month))
      .eq("transactions.is_transfer", false)
      .eq("transactions.exclude_from_budget", false)
      .lt("amount", 0)
      .not("source_id", "is", null),
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
  ]);

  for (const error of [
    spendingError,
    inflowOutflowError,
    outflowByBucketError,
    sourceBalancesError,
    plainOutflowsError,
    splitOutflowsError,
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

  // Same calc as getBudgetRateData's totalAllocation (lib/queries/budgets.ts)
  // — categories here already carries every category's raw monthly_amount,
  // Transfers' own $0 placeholder included, so adding transfersMonthlyTotal
  // (the same getSinkingAndTransferMonthlyTotal call that function makes)
  // reaches the identical figure without a second query for it.
  const categoriesTotal = (categories ?? []).reduce((sum, c) => sum + c.monthly_amount, 0);
  const totalAllocation = categoriesTotal + transfersMonthlyTotal;

  const budgetedOutflowRaw = outflowByBucket?.find((b) => b.bucket === "budget")?.amount ?? null;
  const otherOutflowRaw = outflowByBucket?.find((b) => b.bucket === "other")?.amount ?? null;

  // The Income source is used whether Month Ahead is on or off (income always
  // tracks to it), so nothing is hidden here any more.
  const visibleSourceBalances = sourceBalances ?? [];

  const spentBySourceId = new Map<string, number>();
  for (const row of [...(plainOutflows ?? []), ...(splitOutflows ?? [])]) {
    if (!row.source_id) continue;
    spentBySourceId.set(row.source_id, (spentBySourceId.get(row.source_id) ?? 0) - row.amount);
  }

  return {
    hasBudget: userId !== null,
    categorySpending,
    ...computeDashboardTotals({
      income: inflowOutflow?.income ?? 0,
      otherInflow: inflowOutflow?.other_inflow ?? 0,
      budgetedOutflowRaw,
      otherOutflowRaw,
      categorizedIncome: budgetCategoryIncome?.amount ?? 0,
      totalAllocation,
    }),
    // Every (non-archived) source, so Source Allocation can list them all;
    // ones with no spending this month show as $0.
    sourceOutflows: visibleSourceBalances
      .filter((s): s is typeof s & { id: string; name: string } => s.id !== null && s.name !== null)
      .map((s) => ({ id: s.id, name: s.name, spent: spentBySourceId.get(s.id) ?? 0 })),
    floatBalance: visibleSourceBalances.find((s) => s.type === "float")?.balance ?? 0,
  };
}

// Last 4 Months: per-month totals from the same views (and the same
// computeDashboardTotals) the current-month figures use, so a month's column
// always matches what the Dashboard shows when that month is selected.
// Allocation history isn't stored — categories/sinking/transfer amounts are
// current values only — so the caller fills in totalAllocation with one
// figure for every month; a month whose budget differed shows today's
// budget, not the one it had.
export async function getMonthlyTrend(months: string[]) {
  const supabase = await createClient();
  const [
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflowByBucket, error: outflowByBucketError },
  ] = await Promise.all([
    supabase.from("v_inflow_outflow").select("*").in("month", months),
    supabase.from("v_outflow_by_bucket").select("*").in("month", months),
  ]);
  if (inflowOutflowError) throw new Error(inflowOutflowError.message);
  if (outflowByBucketError) throw new Error(outflowByBucketError.message);

  return [...months].sort().map((month) => {
    const io = inflowOutflow?.find((r) => r.month === month);
    const bucket = (name: string) =>
      outflowByBucket?.find((b) => b.month === month && b.bucket === name)?.amount ?? null;
    const totals = computeDashboardTotals({
      income: io?.income ?? 0,
      otherInflow: io?.other_inflow ?? 0,
      budgetedOutflowRaw: bucket("budget"),
      otherOutflowRaw: bucket("other"),
      categorizedIncome: 0,
      totalAllocation: 0,
    });
    return {
      month,
      income: totals.income,
      inflows: totals.inflows,
      budgetedOutflow: totals.budgetedOutflow,
      outflows: totals.outflows,
    };
  });
}
