"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logChange } from "@/lib/actions/log";

const ACCOUNT_TYPES = ["checking", "savings", "credit_card", "manual"] as const;

// Both actions return { error } instead of throwing — a thrown error from a
// Server Action bound to a plain <form action> (no client-side handler)
// bubbles to the route's error boundary and crashes the whole page, and in
// production the boundary only gets Next's generic digest-only message
// anyway, not this actual text. See lib/actions/sources.ts for the same
// fix on createSource, where this was first found.
export async function createManualAccount(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const accountName = String(formData.get("account_name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "manual");
  const currentBalance = Number(formData.get("current_balance") ?? 0);
  if (!accountName) return { error: "Enter an account name." };
  if (!ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number])) {
    return { error: "Not a valid account type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    account_name: accountName,
    account_type: accountType,
    current_balance: currentBalance,
    is_manual: true,
    status: "active",
  });
  if (error) return { error: error.message };

  await logChange(
    supabase,
    user.id,
    "Accounts",
    `Account: ${accountName}`,
    null,
    `$${currentBalance.toFixed(2)}`,
  );

  revalidatePath("/accounts");
  return null;
}

export async function deleteManualAccount(
  accountId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (count && count > 0) {
    return {
      error: `This account has ${count} transaction${count === 1 ? "" : "s"}. Delete those first — deleting the account would delete them too.`,
    };
  }

  const { data: account, error: fetchError } = await supabase
    .from("accounts")
    .select("account_name, current_balance")
    .eq("id", accountId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("is_manual", true);
  if (error) return { error: error.message };

  if (account) {
    await logChange(
      supabase,
      user.id,
      "Accounts",
      `Account: ${account.account_name}`,
      `$${account.current_balance.toFixed(2)}`,
      null,
    );
  }

  revalidatePath("/accounts");
  return null;
}
