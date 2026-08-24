"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateSourceInput } from "@/lib/sources/validate-source";
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
  const type = String(formData.get("type") ?? "past_payment");
  const startingBalance = Number(formData.get("balance") ?? 0);
  const depositDateInput = String(formData.get("deposit_date") ?? "").trim();
  if (!name) return { error: "Enter a name for the source." };

  if (type === "budget") {
    return { error: "Budget sources are managed automatically per budget." };
  }

  const depositDate =
    type === "past_payment" || type === "future_repayment" ? depositDateInput || null : null;

  const validation = validateSourceInput({ type, depositDate });
  if (!validation.ok) return { error: validation.error };

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
  if (error) return { error: error.message };

  // A Fund-type source always owns a brand-new Fund (rather than picking
  // one of the user's existing Funds) — creating one is what this form is
  // for, and the Fund's balance (not this source row's) is what drives its
  // displayed balance from here on (see getSourcesWithBalance).
  if (type === "fund") {
    const { data: fund, error: fundError } = await supabase
      .from("funds")
      .insert({ user_id: user.id, name, balance: startingBalance })
      .select("id")
      .single();
    if (fundError) return { error: fundError.message };

    const { error: linkError } = await supabase.from("source_funds").insert({
      user_id: user.id,
      source_id: source.id,
      fund_id: fund.id,
    });
    if (linkError) return { error: linkError.message };
  }

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

export async function adjustSourceBalance(
  sourceId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount) return null;

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

  // Atomic balance = balance + amount in the DB (see adjust_source_balance)
  // rather than reading balance then writing it back, which would race two
  // concurrent adjustments (double-submit, two tabs) into dropping one.
  const { error } = await supabase.rpc("adjust_source_balance", {
    p_source_id: sourceId,
    p_delta: amount,
  });
  if (error) return { error: error.message };

  await logChange(
    supabase,
    user.id,
    "Sources",
    `${source.name} — Balance`,
    money(source.balance),
    money(source.balance + amount),
  );

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

export async function archiveFund(
  fundId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
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
  if (fetchError) return { error: fetchError.message };

  // Archives the Fund and its linked Source together (see archive_fund) —
  // a Fund-type Source always owns exactly one Fund, so leaving the Source
  // active after its Fund is archived would strand it: still selectable
  // elsewhere, with nothing left to display a balance for it.
  const { error } = await supabase.rpc("archive_fund", { p_fund_id: fundId });
  if (error) return { error: error.message };

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
  return null;
}

export async function adjustFundBalance(
  fundId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount) return null;

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
  if (fetchError) return { error: fetchError.message };
  if (!fund) return { error: "Fund not found." };

  // See adjustSourceBalance — atomic increment via adjust_fund_balance
  // instead of a read-then-write that could race a concurrent adjustment.
  const { error } = await supabase.rpc("adjust_fund_balance", {
    p_fund_id: fundId,
    p_delta: amount,
  });
  if (error) return { error: error.message };

  await logChange(
    supabase,
    user.id,
    "Sources",
    `${fund.name} — Balance`,
    money(fund.balance),
    money(fund.balance + amount),
  );

  revalidatePath("/sources");
  return null;
}

export async function setFundBalance(
  fundId: string,
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

  const { data: fund, error: fetchError } = await supabase
    .from("funds")
    .select("name, balance")
    .eq("id", fundId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!fund) return { error: "Fund not found." };

  const { error } = await supabase
    .from("funds")
    .update({ balance: Number(amount) })
    .eq("id", fundId);
  if (error) return { error: error.message };

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
  return null;
}
