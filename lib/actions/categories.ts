"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCategory(budgetId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmount = Number(formData.get("monthly_amount") ?? 0);
  if (!name) return;

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
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
}

export async function updateCategory(
  categoryId: string,
  budgetId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmount = Number(formData.get("monthly_amount") ?? 0);
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, monthly_amount: monthlyAmount })
    .eq("id", categoryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
}

export async function deleteCategory(categoryId: string, budgetId: string) {
  const supabase = await createClient();
  // transactions.category_id and transaction_splits.category_id are
  // `on delete set null`, so affected transactions fall back to Uncategorized.
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
