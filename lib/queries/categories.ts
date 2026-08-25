import { createClient } from "@/lib/supabase/server";

// Excluded Categories (see Settings) — a separate, lightweight fetch since
// Settings doesn't otherwise need the current budget's full category list,
// just this one carved-out subset plus the budget id to create more under.
export async function getExcludedCategories() {
  const supabase = await createClient();
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (budgetError) throw new Error(budgetError.message);
  if (!budget) return { budgetId: null, categories: [] };

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("budget_id", budget.id)
    .eq("is_excluded", true)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(error.message);

  return { budgetId: budget.id, categories: data ?? [] };
}
