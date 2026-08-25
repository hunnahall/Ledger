"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logChange } from "@/lib/actions/log";

function money(amount: number): string {
  return `$${amount.toFixed(2)}/mo`;
}

export async function createCategory(
  budgetId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmount = Number(formData.get("monthly_amount") ?? 0);
  if (!name) return { error: "Enter a name for the category." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    budget_id: budgetId,
    name,
    monthly_amount: monthlyAmount,
  });
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Budgets", `Category: ${name}`, null, money(monthlyAmount));

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  return null;
}

export async function updateCategory(
  categoryId: string,
  budgetId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmount = Number(formData.get("monthly_amount") ?? 0);
  if (!name) return { error: "Enter a name for the category." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("name, monthly_amount")
    .eq("id", categoryId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Category not found." };

  const { error } = await supabase
    .from("categories")
    .update({ name, monthly_amount: monthlyAmount })
    .eq("id", categoryId);
  if (error) return { error: error.message };

  if (existing.name !== name) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `Category name (was ${existing.name})`,
      existing.name,
      name,
    );
  }
  if (existing.monthly_amount !== monthlyAmount) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `${name} — Monthly amount`,
      money(existing.monthly_amount),
      money(monthlyAmount),
    );
  }

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  return null;
}

export async function deleteCategory(
  categoryId: string,
  budgetId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("name, monthly_amount")
    .eq("id", categoryId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  // transactions.category_id and transaction_splits.category_id are
  // `on delete set null`, so affected transactions fall back to Uncategorized.
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: error.message };

  if (existing) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `Category: ${existing.name}`,
      money(existing.monthly_amount),
      null,
    );
  }

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return null;
}
