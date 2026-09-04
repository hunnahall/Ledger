"use server";

import { requireUser } from "@/lib/supabase/auth";
import { logChange } from "@/lib/actions/log";
import { revalidateLedgerPages } from "@/lib/actions/revalidate";
import { getSettings } from "@/lib/queries/settings";
import { currentMonthISO } from "@/lib/dates";
import { logMoney, parseMoney } from "@/lib/format";

const money = (amount: number) => logMoney(amount, "/mo");

export async function createSourceTransfer(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const sourceId = String(formData.get("source_id") ?? "");
  // source_transfers_amount_check requires a positive amount; validating
  // here turns a bare `Number("")` -> 0 (or "abc" -> NaN) into a message
  // instead of a raw constraint error.
  const parsed = parseMoney(formData.get("amount"), { positive: true });
  if (!name) return { error: "Enter a name for the source transfer." };
  if (!sourceId) return { error: "Choose a source." };
  if ("error" in parsed) return parsed;
  const amount = parsed.amount;

  const { supabase, user } = await requireUser();
  const settings = await getSettings();

  const { error } = await supabase.from("source_transfers").insert({
    user_id: user.id,
    source_id: sourceId,
    name,
    amount,
    // Marks this month as already applied so ensure_month_current doesn't
    // credit it the instant the sources/budget page is next loaded — the
    // first automatic transfer should wait for the actual start of next
    // month, same as every other recurring monthly line item.
    last_applied_month: currentMonthISO(settings.timezone),
  });
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Budgets", `Source Transfer: ${name}`, null, money(amount));

  revalidateLedgerPages();
  return null;
}

export async function updateSourceTransfer(
  sourceTransferId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const sourceId = String(formData.get("source_id") ?? "");
  // source_transfers_amount_check requires a positive amount; validating
  // here turns a bare `Number("")` -> 0 (or "abc" -> NaN) into a message
  // instead of a raw constraint error.
  const parsed = parseMoney(formData.get("amount"), { positive: true });
  if (!name) return { error: "Enter a name for the source transfer." };
  if (!sourceId) return { error: "Choose a source." };
  if ("error" in parsed) return parsed;
  const amount = parsed.amount;

  const { supabase, user } = await requireUser();

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

  revalidateLedgerPages();
  return null;
}

export async function deleteSourceTransfer(
  sourceTransferId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const { supabase, user } = await requireUser();

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

  revalidateLedgerPages();
  return null;
}
