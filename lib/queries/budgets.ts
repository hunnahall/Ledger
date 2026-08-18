import { createClient } from "@/lib/supabase/server";
import { currentMonthISO } from "@/lib/dates";
import { computeProgress, spentFromRawAmount } from "@/lib/progress";

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
  // budgeted amount the first time it's touched each month (no-op once
  // already reset). Every page that displays that balance goes through
  // this function, so this is the one place that needs to call it.
  if (data) {
    const { error: rpcError } = await supabase.rpc("ensure_budget_source_current", {
      p_budget_id: data.id,
    });
    if (rpcError) throw new Error(rpcError.message);
  }

  return data;
}

export async function getBudgetWithCategories(budgetId: string) {
  const supabase = await createClient();
  const month = currentMonthISO();
  const [
    { data: budget, error: budgetError },
    { data: categories, error: categoriesError },
    { data: spending, error: spendingError },
  ] = await Promise.all([
    // maybeSingle (not single): a missing or not-owned budget should
    // resolve to null so the page can render a clean 404, not throw.
    supabase.from("budgets").select("*").eq("id", budgetId).maybeSingle(),
    supabase
      .from("categories")
      .select("*")
      .eq("budget_id", budgetId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
    supabase.from("v_spending_by_category").select("*").eq("month", month),
  ]);

  if (budgetError) throw new Error(budgetError.message);
  if (categoriesError) throw new Error(categoriesError.message);
  if (spendingError) throw new Error(spendingError.message);

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

  return { budget, categories: categoriesWithProgress };
}
