"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SINKING_FREQUENCIES, type SinkingFrequency } from "@/lib/budgets/sinking";

function parseFrequency(value: FormDataEntryValue | null): SinkingFrequency {
  const frequency = String(value ?? "annual");
  return (SINKING_FREQUENCIES as string[]).includes(frequency)
    ? (frequency as SinkingFrequency)
    : "annual";
}

export async function createSinkingExpense(budgetId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const frequency = parseFrequency(formData.get("frequency"));
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("sinking_expenses").insert({
    user_id: user.id,
    budget_id: budgetId,
    name,
    amount,
    frequency,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
}

export async function updateSinkingExpense(
  sinkingExpenseId: string,
  budgetId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const frequency = parseFrequency(formData.get("frequency"));
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sinking_expenses")
    .update({ name, amount, frequency })
    .eq("id", sinkingExpenseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
}

export async function archiveSinkingExpense(sinkingExpenseId: string, budgetId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sinking_expenses")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sinkingExpenseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
}
