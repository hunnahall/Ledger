"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateSourceInput,
  isReservedSourceType,
  RESERVED_SOURCE_TYPE_MESSAGES,
  type SourceType,
} from "@/lib/sources/validate-source";
import { logChange } from "@/lib/actions/log";

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Takes/returns the (prevState, formData) => nextState shape useActionState
// expects, rather than throwing — a thrown error from a Server Action
// invoked through a plain <form action> (no client-side handler) bubbles
// all the way up to the route's error boundary, crashing the whole page
// for what's usually just an incomplete form (e.g. "pick a fund"), and in
// production the boundary only gets Next's generic digest-only message
// anyway, not this actual text. Returning it instead lets the form show it
// inline without losing anything the user already typed.
export async function createSource(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "reimbursement");
  const startingBalance = Number(formData.get("balance") ?? 0);
  const depositDateInput = String(formData.get("deposit_date") ?? "").trim();
  if (!name) return { error: "Enter a name for the source." };

  if (isReservedSourceType(type)) {
    return { error: RESERVED_SOURCE_TYPE_MESSAGES[type] };
  }

  const depositDate = type === "reimbursement" ? depositDateInput || null : null;

  const validation = validateSourceInput({ type, depositDate });
  if (!validation.ok) return { error: validation.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("sources").insert({
    user_id: user.id,
    name,
    // Valid by construction: validateSourceInput above already checked
    // `type` is one of SOURCE_TYPES.
    type: type as SourceType,
    balance: startingBalance,
    deposit_date: depositDate,
  });
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Sources", `Source: ${name}`, null, money(startingBalance));

  revalidatePath("/sources");
  return null;
}

export async function archiveSource(
  sourceId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: source, error: fetchError } = await supabase
    .from("sources")
    .select("name, balance")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from("sources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) return { error: error.message };

  if (source) {
    await logChange(
      supabase,
      user.id,
      "Sources",
      `Source: ${source.name}`,
      `active (${money(source.balance)})`,
      "archived",
    );
  }

  revalidatePath("/sources");
  return null;
}

export async function renameSource(
  sourceId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the source." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: fetchError } = await supabase
    .from("sources")
    .select("name")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Source not found." };

  const { error } = await supabase.from("sources").update({ name }).eq("id", sourceId);
  if (error) return { error: error.message };

  if (existing.name !== name) {
    await logChange(
      supabase,
      user.id,
      "Sources",
      `Source name (was ${existing.name})`,
      existing.name,
      name,
    );
  }

  revalidatePath("/sources");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/transactions");
  return null;
}

export async function deleteSource(
  sourceId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: source, error: fetchError } = await supabase
    .from("sources")
    .select("name, balance, is_system")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!source) return { error: "Source not found." };
  if (source.is_system) {
    return { error: "System sources can't be deleted — archive instead." };
  }

  // source_transfers.source_id is `not null ... on delete cascade` (unlike
  // transactions.source_id / transaction_splits.source_id, which are `on
  // delete set null`) — deleting a source with an active Source Transfer
  // would silently delete that Source Transfer too, so block it instead.
  const { data: transfers, error: transfersError } = await supabase
    .from("source_transfers")
    .select("name")
    .eq("source_id", sourceId);
  if (transfersError) return { error: transfersError.message };
  if (transfers && transfers.length > 0) {
    const names = transfers.map((t) => t.name).join(", ");
    return {
      error: `Remove the Source Transfer${transfers.length > 1 ? "s" : ""} using this source first: ${names}.`,
    };
  }

  // transactions.source_id, transactions.transfer_from_source_id,
  // transactions.transfer_to_source_id, and transaction_splits.source_id
  // are all `on delete set null`, so affected transactions fall back to
  // No source automatically.
  const { error } = await supabase.from("sources").delete().eq("id", sourceId);
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Sources", `Source: ${source.name}`, money(source.balance), null);

  revalidatePath("/sources");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/transactions");
  return null;
}

export async function setSourceBalance(
  sourceId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const amount = formData.get("amount");
  if (amount === null || amount === "") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: source, error: fetchError } = await supabase
    .from("sources")
    .select("name, balance")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!source) return { error: "Source not found." };

  const { error } = await supabase
    .from("sources")
    .update({ balance: Number(amount) })
    .eq("id", sourceId);
  if (error) return { error: error.message };

  if (source.balance !== Number(amount)) {
    await logChange(
      supabase,
      user.id,
      "Sources",
      `${source.name} — Balance`,
      money(source.balance),
      money(Number(amount)),
    );
  }

  revalidatePath("/sources");
  return null;
}

