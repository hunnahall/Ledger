"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateSourceInput } from "@/lib/sources/validate-source";
import { logChange } from "@/lib/actions/log";

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

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

  await logChange(supabase, user.id, "Sources", `Source: ${name}`, null, money(startingBalance));

  revalidatePath("/sources");
}

export async function archiveSource(sourceId: string) {
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
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("sources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw new Error(error.message);

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
}

export async function adjustSourceBalance(sourceId: string, formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount) return;

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
  if (fetchError) throw new Error(fetchError.message);
  if (!source) throw new Error("Source not found.");

  // Atomic balance = balance + amount in the DB (see adjust_source_balance)
  // rather than reading balance then writing it back, which would race two
  // concurrent adjustments (double-submit, two tabs) into dropping one.
  const { error } = await supabase.rpc("adjust_source_balance", {
    p_source_id: sourceId,
    p_delta: amount,
  });
  if (error) throw new Error(error.message);

  await logChange(
    supabase,
    user.id,
    "Sources",
    `${source.name} — Balance`,
    money(source.balance),
    money(source.balance + amount),
  );

  revalidatePath("/sources");
}

export async function setSourceBalance(sourceId: string, formData: FormData) {
  const amount = formData.get("amount");
  if (amount === null || amount === "") return;

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
  if (fetchError) throw new Error(fetchError.message);
  if (!source) throw new Error("Source not found.");

  const { error } = await supabase
    .from("sources")
    .update({ balance: Number(amount) })
    .eq("id", sourceId);
  if (error) throw new Error(error.message);

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

  await logChange(supabase, user.id, "Sources", `Fund: ${name}`, null, money(startingBalance));

  revalidatePath("/sources");
}

export async function archiveFund(fundId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: fund, error: fetchError } = await supabase
    .from("funds")
    .select("name, balance")
    .eq("id", fundId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("funds")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", fundId);
  if (error) throw new Error(error.message);

  if (fund) {
    await logChange(
      supabase,
      user.id,
      "Sources",
      `Fund: ${fund.name}`,
      `active (${money(fund.balance)})`,
      "archived",
    );
  }

  revalidatePath("/sources");
}

export async function adjustFundBalance(fundId: string, formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: fund, error: fetchError } = await supabase
    .from("funds")
    .select("name, balance")
    .eq("id", fundId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!fund) throw new Error("Fund not found.");

  // See adjustSourceBalance — atomic increment via adjust_fund_balance
  // instead of a read-then-write that could race a concurrent adjustment.
  const { error } = await supabase.rpc("adjust_fund_balance", {
    p_fund_id: fundId,
    p_delta: amount,
  });
  if (error) throw new Error(error.message);

  await logChange(
    supabase,
    user.id,
    "Sources",
    `${fund.name} — Balance`,
    money(fund.balance),
    money(fund.balance + amount),
  );

  revalidatePath("/sources");
}

export async function setFundBalance(fundId: string, formData: FormData) {
  const amount = formData.get("amount");
  if (amount === null || amount === "") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: fund, error: fetchError } = await supabase
    .from("funds")
    .select("name, balance")
    .eq("id", fundId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!fund) throw new Error("Fund not found.");

  const { error } = await supabase
    .from("funds")
    .update({ balance: Number(amount) })
    .eq("id", fundId);
  if (error) throw new Error(error.message);

  if (fund.balance !== Number(amount)) {
    await logChange(
      supabase,
      user.id,
      "Sources",
      `${fund.name} — Balance`,
      money(fund.balance),
      money(Number(amount)),
    );
  }

  revalidatePath("/sources");
}
