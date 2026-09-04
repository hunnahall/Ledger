"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { revalidateLedgerPages } from "@/lib/actions/revalidate";
import { logChange } from "@/lib/actions/log";
import { logMoney, parseMoney } from "@/lib/format";

const money = (amount: number) => logMoney(amount, "/mo");

export async function createCategory(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const parsedMonthly = parseMoney(formData.get("monthly_amount"), { fallback: 0 });
  if ("error" in parsedMonthly) return parsedMonthly;
  const monthlyAmount = parsedMonthly.amount;
  if (!name) return { error: "Enter a name for the category." };

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    monthly_amount: monthlyAmount,
  });
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Budgets", `Category: ${name}`, null, money(monthlyAmount));

  revalidateLedgerPages();
  revalidatePath("/settings");
  return null;
}

export async function updateCategory(
  categoryId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const parsedMonthly = parseMoney(formData.get("monthly_amount"), { fallback: 0 });
  if ("error" in parsedMonthly) return parsedMonthly;
  const monthlyAmount = parsedMonthly.amount;
  if (!name) return { error: "Enter a name for the category." };

  const { supabase, user } = await requireUser();

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

  revalidateLedgerPages();
  revalidatePath("/settings");
  return null;
}

export async function deleteCategory(
  categoryId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const { supabase, user } = await requireUser();

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

  revalidateLedgerPages();
  revalidatePath("/settings");
  return null;
}
