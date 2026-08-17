import { createClient } from "@/lib/supabase/server";

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
  return data;
}

export async function getBudgetWithCategories(budgetId: string) {
  const supabase = await createClient();
  const [{ data: budget, error: budgetError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase.from("budgets").select("*").eq("id", budgetId).single(),
      supabase
        .from("categories")
        .select("*")
        .eq("budget_id", budgetId)
        .is("archived_at", null)
        .order("sort_order", { ascending: true }),
    ]);

  if (budgetError) throw new Error(budgetError.message);
  if (categoriesError) throw new Error(categoriesError.message);

  return { budget, categories: categories ?? [] };
}
