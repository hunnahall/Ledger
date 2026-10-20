import { createClient } from "@/lib/supabase/server";
import { spentFromRawAmount } from "@/lib/progress";
import { computeDashboardTotals } from "@/lib/dashboard-metrics";
import { ensureBudgetCurrent, getCommitmentRows, sinkingAndTransferTotal } from "@/lib/queries/budgets";
import { daysInMonthISO, nextMonthISO } from "@/lib/dates";
import { getLegs } from "@/lib/queries/legs";
import { cumulativeExpenseByDay } from "@/lib/transactions/legs";
import { TRANSFERS_CATEGORY_NAME } from "@/lib/budget/category-status";
import { dailySpending } from "@/lib/charts/daily-spending";
import { computeMoneyMap } from "@/lib/charts/money-map";
import { sourceTones, type ChartTone } from "@/lib/charts/source-tones";
import { daysElapsed } from "@/lib/dashboard-months";

/** One selected month's own figures, for the charts that draw months side by side. */
export type MonthFigures = {
  month: string;
  daysInMonth: number;
  /** Days of the month that have happened (all of a past month). */
  throughDay: number;
  /** What the budget committed that month: saved at month start, else today's. */
  allocation: number;
  /** Cumulative Budget expense per day, days 1..throughDay. */
  expenseByDay: number[];
  income: number;
  inflows: number;
  expense: number;
  outflows: number;
};

// Everything the Dashboard draws, for any set of the months Ledger keeps
// (`months`, oldest first). Totals are the selected months added together;
// `months` in the result keeps each month's own figures. `trend` is the one
// exception to the selection: By Month compares the current month with the
// ones before it, so it covers every kept month (`allMonths`). Every transaction
// is read once, in one range, and each chart filters it in memory: this used
// to be four separate reads over overlapping ranges, each re-reading Sources.
export async function getDashboardData(
  months: string[],
  allMonths: string[],
  today: string,
  budgetType: "rolling" | "advanced",
) {
  const supabase = await createClient();
  const selected = new Set(months);
  const from = months[0];
  const to = nextMonthISO(months[months.length - 1]);
  // Allocation is needed for each selected month and, under Advanced (this
  // month's income funds next month), for the month after each one.
  const allocationMonths = [...new Set([...allMonths, ...months.map(nextMonthISO)])];

  // Awaited first: it applies any month-start roll-forward, and every read
  // below must see that write.
  const userId = await ensureBudgetCurrent();

  const [
    { data: spending, error: spendingError },
    { data: inflowOutflow, error: inflowOutflowError },
    { data: outflows, error: outflowsError },
    { data: budgetCategoryIncome, error: budgetCategoryIncomeError },
    { data: allSources, error: sourcesError },
    { data: categories, error: categoriesError },
    { data: savedAllocations, error: savedError },
    commitments,
  ] = await Promise.all([
    supabase.from("v_spending_by_category").select("category_id, amount").in("month", months),
    // Every kept month, for By Month; the totals below keep only the selection.
    supabase.from("v_inflow_outflow").select("month, income, other_inflows").in("month", allMonths),
    supabase.from("v_outflows").select("month, expense, other_outflows").in("month", allMonths),
    supabase.from("v_budget_category_income").select("amount").in("month", months),
    supabase.from("sources").select("id, name, type, balance, is_system, created_at, archived_at").order("created_at"),
    supabase.from("categories").select("id, name, monthly_amount").is("archived_at", null).order("sort_order"),
    supabase.from("monthly_totals").select("month, amount").eq("kind", "allocation").in("month", allocationMonths),
    userId ? getCommitmentRows(userId) : Promise.resolve({ sinking: [], transfers: [] }),
  ]);

  for (const error of [
    spendingError,
    inflowOutflowError,
    outflowsError,
    budgetCategoryIncomeError,
    sourcesError,
    categoriesError,
    savedError,
  ]) {
    if (error) throw new Error(error.message);
  }

  const legs = (await getLegs(supabase, from, to, allSources ?? [])).filter((l) =>
    selected.has(`${l.postedDate.slice(0, 7)}-01`),
  );

  const categoriesTotal = (categories ?? []).reduce((sum, c) => sum + c.monthly_amount, 0);
  const saved = new Map((savedAllocations ?? []).map((r) => [r.month, r.amount]));
  // The allocation saved when the month started; months from before that
  // was saved (and next month, not started yet) use today's categories with
  // that month's commitments.
  const allocationFor = (month: string) =>
    saved.get(month) ?? categoriesTotal + sinkingAndTransferTotal(commitments, month);

  const sum = <T>(rows: T[] | null, pick: (r: T) => number | null) =>
    (rows ?? []).reduce((total, r) => total + (pick(r) ?? 0), 0);

  // Categories: spent added up over the selected months, budget the monthly
  // amount once per month (Transfers takes each month's commitments).
  const spentByCategory = new Map<string, number>();
  for (const s of spending ?? []) {
    if (!s.category_id) continue;
    spentByCategory.set(s.category_id, (spentByCategory.get(s.category_id) ?? 0) + spentFromRawAmount(s.amount));
  }
  const transfersBudget = months.reduce((total, m) => total + sinkingAndTransferTotal(commitments, m), 0);
  const categorySpending = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    monthly_amount: c.name === TRANSFERS_CATEGORY_NAME ? transfersBudget : c.monthly_amount * months.length,
    spent: spentByCategory.get(c.id) ?? 0,
  }));

  const allocation = months.reduce((total, m) => total + allocationFor(m), 0);
  const fundingAllocation =
    budgetType === "advanced" ? months.reduce((total, m) => total + allocationFor(nextMonthISO(m)), 0) : allocation;

  const selectedInflows = (inflowOutflow ?? []).filter((r) => r.month && selected.has(r.month));
  const selectedOutflows = (outflows ?? []).filter((r) => r.month && selected.has(r.month));
  const totals = computeDashboardTotals({
    income: sum(selectedInflows, (r) => r.income),
    otherInflows: sum(selectedInflows, (r) => r.other_inflows),
    expenseRaw: sum(selectedOutflows, (r) => r.expense),
    otherOutflowsRaw: sum(selectedOutflows, (r) => r.other_outflows),
    categorizedIncome: sum(budgetCategoryIncome, (r) => r.amount),
    allocation,
  });

  // One month's own income, inflows, expense and outflows.
  const monthTotals = (month: string) => {
    const io = inflowOutflow?.find((r) => r.month === month);
    const out = outflows?.find((r) => r.month === month);
    return computeDashboardTotals({
      income: io?.income ?? 0,
      otherInflows: io?.other_inflows ?? 0,
      expenseRaw: out?.expense ?? null,
      otherOutflowsRaw: out?.other_outflows ?? null,
      categorizedIncome: 0,
      allocation: 0,
    });
  };

  const trend = [...allMonths].sort().map((month) => {
    const m = monthTotals(month);
    return {
      month,
      allocation: allocationFor(month),
      income: m.income,
      inflows: m.inflows,
      expense: m.expense,
      outflows: m.outflows,
    };
  });

  const monthFigures: MonthFigures[] = months.map((month) => {
    const m = monthTotals(month);
    const end = nextMonthISO(month);
    const throughDay = daysElapsed(month, today);
    return {
      month,
      daysInMonth: daysInMonthISO(month),
      throughDay,
      allocation: allocationFor(month),
      expenseByDay: cumulativeExpenseByDay(
        legs.filter((l) => l.postedDate >= month && l.postedDate < end),
        throughDay,
      ),
      income: m.income,
      inflows: m.inflows,
      expense: m.expense,
      outflows: m.outflows,
    };
  });

  const sources = (allSources ?? []).filter((s) => s.archived_at === null);
  // One color per Source, shared by Source Allocation and the money map.
  const tones = sourceTones(sources.map((s) => ({ id: s.id, type: s.type, isSystem: s.is_system, createdAt: s.created_at })));

  // Gross spending per Source: negative amounts only, so money coming into
  // a Source never offsets its spending and the slices sum to outflows.
  const spentBySourceId = new Map<string, number>();
  for (const leg of legs) {
    if (!leg.sourceId || leg.amount >= 0) continue;
    spentBySourceId.set(leg.sourceId, (spentBySourceId.get(leg.sourceId) ?? 0) - leg.amount);
  }

  return {
    hasBudget: userId !== null,
    ...totals,
    fundingAllocation,
    categorySpending,
    months: monthFigures,
    trend,
    dailySpending: dailySpending(legs),
    sourceOutflows: sources.map((s) => ({ id: s.id, name: s.name, spent: spentBySourceId.get(s.id) ?? 0 })),
    sourceTones: Object.fromEntries(tones) as Record<string, ChartTone | null>,
    // Balances right now, whatever months are selected.
    moneyMap: computeMoneyMap({
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        isSystem: s.is_system,
        createdAt: s.created_at,
        balance: s.balance,
      })),
    }),
    floatBalance: sources.find((s) => s.type === "float")?.balance ?? 0,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
