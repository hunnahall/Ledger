"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SINKING_FREQUENCIES,
  type SinkingContributionType,
  type SinkingFrequency,
} from "@/lib/budgets/sinking";

function parseFrequency(value: FormDataEntryValue | null): SinkingFrequency {
  const frequency = String(value ?? "annual");
  return (SINKING_FREQUENCIES as string[]).includes(frequency)
    ? (frequency as SinkingFrequency)
    : "annual";
}

function parseContributionType(value: FormDataEntryValue | null): SinkingContributionType {
  return value === "goal" ? "goal" : "frequency";
}

// Mode-specific fields (rows come from a single form): a goal-mode submit
// must null out frequency, and vice versa, to satisfy the DB's XOR check
// constraint on (contribution_type, frequency, target_amount, target_date).
function modeFields(formData: FormData) {
  const contributionType = parseContributionType(formData.get("contribution_type"));
  if (contributionType === "goal") {
    return {
      contribution_type: "goal" as const,
      frequency: null,
      amount: 0,
      target_amount: Number(formData.get("target_amount") ?? 0),
      target_date: String(formData.get("target_date") ?? ""),
    };
  }
  return {
    contribution_type: "frequency" as const,
    frequency: parseFrequency(formData.get("frequency")),
    amount: Number(formData.get("amount") ?? 0),
    target_amount: null,
    target_date: null,
  };
}

export async function createSinkingExpense(budgetId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
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
    ...modeFields(formData),
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
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sinking_expenses")
    .update({ name, ...modeFields(formData) })
    .eq("id", sinkingExpenseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
}

export async function deleteSinkingExpense(sinkingExpenseId: string, budgetId: string) {
  const supabase = await createClient();
  // The linked Fund (fund_id) isn't deleted along with this — any balance
  // already set aside stays put, just no longer tied to a sinking expense.
  const { error } = await supabase
    .from("sinking_expenses")
    .delete()
    .eq("id", sinkingExpenseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
}
