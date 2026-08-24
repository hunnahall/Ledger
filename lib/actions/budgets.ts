"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logChange } from "@/lib/actions/log";

export async function createBudget(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the budget." };

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

  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Budgets", `Budget: ${name}`, null, "created");

  revalidatePath("/budgets");
  return null;
}

export async function setCurrentBudget(budgetId: string): Promise<{ error: string } | null> {
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
  if (!target) return { error: "Budget not found." };

  const { error: unsetError } = await supabase
    .from("budgets")
    .update({ is_current: false })
    .eq("user_id", user.id)
    .eq("is_current", true);
  if (unsetError) return { error: unsetError.message };

  const { error: setError } = await supabase
    .from("budgets")
    .update({ is_current: true })
    .eq("id", budgetId);
  if (setError) return { error: setError.message };

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return null;
}

export async function renameBudget(
  budgetId: string,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the budget." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: fetchError } = await supabase
    .from("budgets")
    .select("name")
    .eq("id", budgetId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Budget not found." };

  const { error } = await supabase
    .from("budgets")
    .update({ name })
    .eq("id", budgetId);
  if (error) return { error: error.message };

  if (existing.name !== name) {
    await logChange(supabase, user.id, "Budgets", "Budget name", existing.name, name);
  }

  revalidatePath("/budgets");
  revalidatePath(`/budgets/${budgetId}`);
  return null;
}

export async function deleteBudget(
  budgetId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: budget } = await supabase
    .from("budgets")
    .select("name, is_current")
    .eq("id", budgetId)
    .maybeSingle();
  if (!budget) return { error: "Budget not found." };

  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Budgets", `Budget: ${budget.name}`, "existed", null);

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
      if (promoteError) return { error: promoteError.message };
    }
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  redirect("/budgets");
}
