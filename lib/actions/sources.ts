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
  const { data: source, error: fetchError } = await supabase
    .from("sources")
    .select("balance")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!source) throw new Error("Source not found.");

  const { error } = await supabase
    .from("sources")
    .update({ balance: source.balance + amount })
    .eq("id", sourceId);
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
  const { data: fund, error: fetchError } = await supabase
    .from("funds")
    .select("balance")
    .eq("id", fundId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!fund) throw new Error("Fund not found.");

  const { error } = await supabase
    .from("funds")
    .update({ balance: fund.balance + amount })
    .eq("id", fundId);
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
