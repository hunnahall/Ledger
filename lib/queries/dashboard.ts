import { createClient } from "@/lib/supabase/server";
import { currentMonthISO } from "@/lib/dates";
import { spentFromRawAmount } from "@/lib/progress";

export async function getDashboardData() {
  const supabase = await createClient();
  const month = currentMonthISO();

  const [
    { data: currentBudget },
    { data: spending },
    { data: inflowOutflow },
    { data: accountBalances },
    { data: sourceBalances },
    { data: floatOutstanding },
    { data: reimbursementsPending },
  ] = await Promise.all([
    supabase.from("budgets").select("id, name").eq("is_current", true).maybeSingle(),
    supabase.from("v_spending_by_category").select("*").eq("month", month),
    supabase.from("v_inflow_outflow").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_account_balances").select("*"),
    supabase.from("v_source_balances").select("*"),
    supabase.from("v_float_outstanding").select("*").maybeSingle(),
    supabase.from("v_reimbursements_pending").select("*"),
  ]);

  let categories: { id: string; name: string; monthly_amount: number }[] = [];
  if (currentBudget) {
    const { data } = await supabase
      .from("categories")
      .select("id, name, monthly_amount")
      .eq("budget_id", currentBudget.id)
      .is("archived_at", null)
      .order("sort_order");
    categories = data ?? [];
  }

  const spendingByCategory = new Map(
    (spending ?? []).map((s) => [s.category_id, spentFromRawAmount(s.amount)]),
  );

  const categorySpending = categories.map((c) => ({
    ...c,
    spent: spendingByCategory.get(c.id) ?? 0,
  }));

  return {
    currentBudget,
    categorySpending,
    inflow: inflowOutflow?.inflow ?? 0,
    outflow: inflowOutflow?.outflow ?? 0,
    accountBalances: accountBalances ?? [],
    sourceBalances: sourceBalances ?? [],
    floatOutstanding: floatOutstanding?.float_outstanding ?? 0,
    reimbursementsPending: reimbursementsPending ?? [],
  };
}
