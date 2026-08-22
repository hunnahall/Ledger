"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBudget(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    name,
    is_current: (count ?? 0) === 0,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/budgets");
}

export async function setCurrentBudget(budgetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: target } = await supabase
    .from("budgets")
    .select("id")
    .eq("id", budgetId)
    .maybeSingle();
  if (!target) throw new Error("Budget not found.");

  const { error: unsetError } = await supabase
    .from("budgets")
    .update({ is_current: false })
    .eq("user_id", user.id)
    .eq("is_current", true);
  if (unsetError) throw new Error(unsetError.message);

  const { error: setError } = await supabase
    .from("budgets")
    .update({ is_current: true })
    .eq("id", budgetId);
  if (setError) throw new Error(setError.message);

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function renameBudget(budgetId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ name })
    .eq("id", budgetId);
  if (error) throw new Error(error.message);

  revalidatePath("/budgets");
  revalidatePath(`/budgets/${budgetId}`);
}

export async function deleteBudget(budgetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: budget } = await supabase
    .from("budgets")
    .select("is_current")
    .eq("id", budgetId)
    .maybeSingle();
  if (!budget) throw new Error("Budget not found.");

  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
  if (error) throw new Error(error.message);

  // Viewing a budget makes it current (see setCurrentBudget), so deleting
  // the one you're looking at is the common case, not the exception —
  // promote another budget to current rather than leaving none set.
  if (budget.is_current) {
    const { data: next } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      const { error: promoteError } = await supabase
        .from("budgets")
        .update({ is_current: true })
        .eq("id", next.id);
      if (promoteError) throw new Error(promoteError.message);
    }
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  redirect("/budgets");
}
