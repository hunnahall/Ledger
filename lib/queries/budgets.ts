import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/supabase/auth";
import { getSettings } from "@/lib/queries/settings";
import { currentMonthISO, monthsRemaining } from "@/lib/dates";
import { computeProgress, spentFromRawAmount } from "@/lib/progress";
import {
  goalMonthlyAmount,
  monthlySinkingAmount,
  type SinkingFrequency,
} from "@/lib/budget/sinking";

// Every user has exactly one budget bucket — the reserved `budget`-type
// Source, always named "Budget", auto-provisioned at signup (see
// handle_new_user). ensure_month_current() rolls the whole month forward in
// one atomic step: it resets that source's balance to this month's total
// budgeted amount (skipped entirely when Month Ahead is on), credits any due
// Source Transfers, pools due sinking-expense contributions into the shared
// Sinking Fund source, and sweeps the shared Income Fund into the budget
// source — each a no-op once already applied this month.
//
// This was four separate RPCs with an ordering comment explaining why the
// income sweep couldn't join the Promise.all. They are now one function
// holding a per-user advisory lock, which also closes a real double-credit
// race: two pages loading at once (Dashboard and Budget both call this)
// could each pass the "already applied?" guard before either committed.
//
// Returns the user id (for callers that need it) or null if unauthenticated.
export async function ensureBudgetCurrent(): Promise<string | null> {
  const { supabase, user } = await getOptionalUser();
  if (!user) return null;

  const { error } = await supabase.rpc("ensure_month_current");
  if (error) throw new Error(error.message);

  return user.id;
}

export async function getBudgetData() {
  const supabase = await createClient();
  const settings = await getSettings();
  const month = currentMonthISO(settings.timezone);

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

type CommitmentRows = {
  sinking: {
    contribution_type: string;
    amount: number;
    frequency: string | null;
    target_amount: number | null;
    target_date: string | null;
    contributed_to_date: number;
  }[];
  transfers: { amount: number }[];
};

// The rows behind every "money the budget commits beyond its categories"
// figure: sinking expenses and Source Transfers. Read once per request and
// priced per month by sinkingAndTransferTotal, since a goal's monthly amount
// depends on the month.
export const getCommitmentRows = cache(async function getCommitmentRows(userId: string): Promise<CommitmentRows> {
  const supabase = await createClient();
  const [{ data: sinking, error: sinkingError }, { data: transfers, error: transfersError }] = await Promise.all([
    supabase
      .from("sinking_expenses")
      .select("contribution_type, amount, frequency, target_amount, target_date, contributed_to_date")
      .eq("user_id", userId)
      .is("archived_at", null),
    supabase.from("source_transfers").select("amount").eq("user_id", userId),
  ]);
  if (sinkingError) throw new Error(sinkingError.message);
  if (transfersError) throw new Error(transfersError.message);
  return { sinking: sinking ?? [], transfers: transfers ?? [] };
});

// Sinking expenses' monthly-equivalent amount (frequency-normalized, or the
// goal-mode remaining-savings pace) plus Source Transfers' amount for
// `month`: what the budget commits to money movement rather than category
// spending. Part of every allocation, and the Transfers category's budget.
export function sinkingAndTransferTotal(rows: CommitmentRows, month: string): number {
  const sinkingTotal = rows.sinking.reduce((sum, expense) => {
    const monthlyAmount =
      expense.contribution_type === "goal"
        ? goalMonthlyAmount(
            expense.target_amount ?? 0,
            expense.contributed_to_date,
            monthsRemaining(expense.target_date ?? month, month),
          )
        : monthlySinkingAmount(expense.amount, expense.frequency as SinkingFrequency);
    return sum + monthlyAmount;
  }, 0);
  return sinkingTotal + rows.transfers.reduce((sum, t) => sum + t.amount, 0);
}
