"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logChange } from "@/lib/actions/log";
import { currentMonthISO } from "@/lib/dates";

function money(amount: number): string {
  return `$${amount.toFixed(2)}/mo`;
}

export async function createSourceTransfer(
  budgetId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const sourceId = String(formData.get("source_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!name) return { error: "Enter a name for the source transfer." };
  if (!sourceId) return { error: "Choose a source." };
  if (!amount) return { error: "Enter an amount." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("source_transfers").insert({
    user_id: user.id,
    budget_id: budgetId,
    source_id: sourceId,
    name,
    amount,
    // Marks this month as already applied so ensure_source_transfers_current
    // doesn't credit it the instant the sources/budget page is next loaded
    // — the first automatic transfer should wait for the actual start of
    // next month, same as every other recurring monthly line item.
    last_applied_month: currentMonthISO(),
  });
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Budgets", `Source Transfer: ${name}`, null, money(amount));

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
  return null;
}

export async function updateSourceTransfer(
  sourceTransferId: string,
  budgetId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const sourceId = String(formData.get("source_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!name) return { error: "Enter a name for the source transfer." };
  if (!sourceId) return { error: "Choose a source." };
  if (!amount) return { error: "Enter an amount." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: fetchError } = await supabase
    .from("source_transfers")
    .select("name, source_id, amount")
    .eq("id", sourceTransferId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Source Transfer not found." };

  const { error } = await supabase
    .from("source_transfers")
    .update({ name, source_id: sourceId, amount })
    .eq("id", sourceTransferId);
  if (error) return { error: error.message };

  if (existing.name !== name) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `Source Transfer name (was ${existing.name})`,
      existing.name,
      name,
    );
  }
  if (existing.amount !== amount) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `${name} — Amount`,
      money(existing.amount),
      money(amount),
    );
  }
  if (existing.source_id !== sourceId) {
    const [{ data: oldSource }, { data: newSource }] = await Promise.all([
      supabase.from("sources").select("name").eq("id", existing.source_id).maybeSingle(),
      supabase.from("sources").select("name").eq("id", sourceId).maybeSingle(),
    ]);
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `${name} — Source`,
      oldSource?.name ?? null,
      newSource?.name ?? null,
    );
  }

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
  return null;
}

export async function deleteSourceTransfer(
  sourceTransferId: string,
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
    .from("source_transfers")
    .select("name, amount")
    .eq("id", sourceTransferId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase.from("source_transfers").delete().eq("id", sourceTransferId);
  if (error) return { error: error.message };

  if (existing) {
    await logChange(
      supabase,
      user.id,
      "Budgets",
      `Source Transfer: ${existing.name}`,
      money(existing.amount),
      null,
    );
  }

  revalidatePath(`/budgets/${budgetId}`);
  revalidatePath("/sources");
  return null;
}
