"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateSourceInput } from "@/lib/sources/validate-source";

export async function createSource(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "past_payment");
  const startingBalance = Number(formData.get("balance") ?? 0);
  const depositDateInput = String(formData.get("deposit_date") ?? "").trim();
  const fundIds = formData.getAll("fund_ids").map(String).filter(Boolean);
  if (!name) return;

  if (type === "budget") {
    throw new Error("Budget sources are managed automatically per budget.");
  }

  const depositDate =
    type === "past_payment" || type === "future_repayment" ? depositDateInput || null : null;

  const validation = validateSourceInput({ type, fundIds, depositDate });
  if (!validation.ok) throw new Error(validation.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: source, error } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      name,
      type,
      balance: startingBalance,
      deposit_date: depositDate,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (type === "fund") {
    const { error: linkError } = await supabase.from("source_funds").insert({
      user_id: user.id,
      source_id: source.id,
      fund_id: fundIds[0],
    });
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath("/sources");
}

export async function archiveSource(sourceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function adjustSourceBalance(sourceId: string, formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount) return;

  const supabase = await createClient();
  // Atomic balance = balance + amount in the DB (see adjust_source_balance)
  // rather than reading balance then writing it back, which would race two
  // concurrent adjustments (double-submit, two tabs) into dropping one.
  const { error } = await supabase.rpc("adjust_source_balance", {
    p_source_id: sourceId,
    p_delta: amount,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function setSourceBalance(sourceId: string, formData: FormData) {
  const amount = formData.get("amount");
  if (amount === null || amount === "") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sources")
    .update({ balance: Number(amount) })
    .eq("id", sourceId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function createFund(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const startingBalance = Number(formData.get("balance") ?? 0);
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("funds").insert({
    user_id: user.id,
    name,
    balance: startingBalance,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function archiveFund(fundId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("funds")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", fundId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function adjustFundBalance(fundId: string, formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount) return;

  const supabase = await createClient();
  // See adjustSourceBalance — atomic increment via adjust_fund_balance
  // instead of a read-then-write that could race a concurrent adjustment.
  const { error } = await supabase.rpc("adjust_fund_balance", {
    p_fund_id: fundId,
    p_delta: amount,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function setFundBalance(fundId: string, formData: FormData) {
  const amount = formData.get("amount");
  if (amount === null || amount === "") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("funds")
    .update({ balance: Number(amount) })
    .eq("id", fundId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}
