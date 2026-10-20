"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { logChange } from "@/lib/actions/log";
import { logMoney, parseMoney } from "@/lib/format";
import { revalidateLedgerPages } from "@/lib/actions/revalidate";

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
  const parsedBalance = parseMoney(formData.get("current_balance"), { fallback: 0 });
  if ("error" in parsedBalance) return parsedBalance;
  const currentBalance = parsedBalance.amount;
  if (!accountName) return { error: "Enter an account name." };
  if (!ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number])) {
    return { error: "Not a valid account type." };
  }

  const { supabase, user } = await requireUser();

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
    logMoney(currentBalance),
  );

  revalidatePath("/accounts");
  return null;
}

// Deletes a manual account, or a bank account whose bank was disconnected.
// Its transactions stay (with no account) and keep their effect on Source
// balances: transactions.account_id is `on delete set null`. An account still
// syncing can't be deleted here; disconnect its bank first.
export async function deleteAccount(
  accountId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const { supabase, user } = await requireUser();

  const { data: account, error: fetchError } = await supabase
    .from("accounts")
    .select("account_name, current_balance, is_manual, bank_connection_id")
    .eq("id", accountId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!account) return { error: "Account not found." };
  if (!account.is_manual && account.bank_connection_id) {
    return { error: "This account is still connected to its bank. Disconnect the bank first." };
  }

  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) return { error: error.message };

  await logChange(
    supabase,
    user.id,
    "Accounts",
    `Account: ${account.account_name}`,
    logMoney(account.current_balance),
    null,
  );

  revalidatePath("/accounts");
  revalidateLedgerPages();
  return null;
}

// Account type is the user's call (SimpleFin doesn't report it). Sync only
// sets "checking" on an account it hasn't seen before, so this sticks.
export async function setAccountType(
  accountId: string,
  accountType: string,
): Promise<{ error: string } | null> {
  if (!ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number])) {
    return { error: "Not a valid account type." };
  }
  const { supabase, user } = await requireUser();

  const { data: existing, error: fetchError } = await supabase
    .from("accounts")
    .select("account_name, account_type")
    .eq("id", accountId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Account not found." };
  if (existing.account_type === accountType) return null;

  const { error } = await supabase
    .from("accounts")
    .update({ account_type: accountType })
    .eq("id", accountId);
  if (error) return { error: error.message };

  await logChange(
    supabase,
    user.id,
    "Accounts",
    `${existing.account_name} — Type`,
    existing.account_type,
    accountType,
  );

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return null;
}
