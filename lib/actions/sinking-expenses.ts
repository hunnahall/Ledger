"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logChange } from "@/lib/actions/log";
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

// One human-readable summary of "however this sinking expense is currently
// configured" — goal and frequency mode don't share fields, so diffing them
// individually for the log would mean logging 4 near-meaningless partial
// changes on every mode switch. One combined line reads better.
function summarizeConfig(row: {
  contribution_type: string;
  amount: number;
  frequency: string | null;
  target_amount: number | null;
  target_date: string | null;
}): string {
  return row.contribution_type === "goal"
    ? `Goal: $${(row.target_amount ?? 0).toFixed(2)} by ${row.target_date ?? "?"}`
    : `$${row.amount.toFixed(2)} ${row.frequency ?? "annual"}`;
}

export async function createSinkingExpense(
  budgetId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the sinking expense." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fields = modeFields(formData);
  const { error } = await supabase.from("sinking_expenses").insert({
    user_id: user.id,
    budget_id: budgetId,
    name,
    ...fields,
  });
  if (error) return { error: error.message };

  await logChange(
    supabase,
    user.id,
    "Budgets",
    `Sinking expense: ${name}`,
    null,
    summarizeConfig(fields),
  );

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
  return null;
}

export async function updateSinkingExpense(
  sinkingExpenseId: string,
  budgetId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the sinking expense." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: fetchError } = await supabase
    .from("sinking_expenses")
    .select("name, contribution_type, amount, frequency, target_amount, target_date")
    .eq("id", sinkingExpenseId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Sinking expense not found." };

  const fields = modeFields(formData);
  const { error } = await supabase
    .from("sinking_expenses")
    .update({ name, ...fields })
    .eq("id", sinkingExpenseId);
  if (error) return { error: error.message };

  if (existing.name !== name) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `Sinking expense name (was ${existing.name})`,
      existing.name,
      name,
    );
  }
  const oldSummary = summarizeConfig(existing);
  const newSummary = summarizeConfig(fields);
  if (oldSummary !== newSummary) {
    await logChange(supabase, user.id, "Budgets", `${name} — Contribution`, oldSummary, newSummary);
  }

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
  return null;
}

export async function deleteSinkingExpense(
  sinkingExpenseId: string,
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
    .from("sinking_expenses")
    .select("name, contribution_type, amount, frequency, target_amount, target_date")
    .eq("id", sinkingExpenseId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  // Whatever this expense already contributed to the shared Sinking Fund
  // stays there — deleting it only stops future monthly contributions.
  const { error } = await supabase
    .from("sinking_expenses")
    .delete()
    .eq("id", sinkingExpenseId);
  if (error) return { error: error.message };

  if (existing) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `Sinking expense: ${existing.name}`,
      summarizeConfig(existing),
      null,
    );
  }

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
  return null;
}
