"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ACCOUNT_TYPES = ["checking", "savings", "credit_card", "manual"] as const;

export async function createManualAccount(formData: FormData) {
  const accountName = String(formData.get("account_name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "manual");
  const currentBalance = Number(formData.get("current_balance") ?? 0);
  if (!accountName) return;
  if (!ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number])) return;

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
  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}

export async function deleteManualAccount(accountId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (count && count > 0) {
    throw new Error(
      `This account has ${count} transaction${count === 1 ? "" : "s"}. Delete those first — deleting the account would delete them too.`,
    );
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("is_manual", true);
  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}
