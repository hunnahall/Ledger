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

