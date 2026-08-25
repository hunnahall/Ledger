"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";
import { findMatchingRule } from "@/lib/transactions/match-vendor-rule";
import { learnVendorRule } from "@/lib/actions/transactions";

export async function createVendorRule(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const description = String(formData.get("merchant") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (!description) return { error: "Enter a merchant name." };
  if (!categoryId) return { error: "Choose a category." };

  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return { error: "Enter a merchant name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await learnVendorRule(supabase, user.id, merchantNormalized, categoryId, null);

  revalidatePath("/settings");
  return null;
}

export async function updateVendorRule(
  ruleId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const description = String(formData.get("merchant") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (!description) return { error: "Enter a merchant pattern." };
  if (!categoryId) return { error: "Choose a category." };

  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return { error: "Enter a merchant pattern." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("vendor_category_rules")
    .update({ merchant_normalized: merchantNormalized, category_id: categoryId })
    .eq("id", ruleId)
    .eq("user_id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "You already have a rule for that pattern." };
    return { error: error.message };
  }

  revalidatePath("/settings");
  return null;
}

// Applies every learned rule to transactions that don't have one yet —
// same substring match as auto-categorization at sync time (see
// findMatchingRule), just runnable on demand so a newly created or edited
// rule can retroactively pick up older transactions without waiting for
// the next sync. Only fills in category_id (and source_id when the
// transaction doesn't already have one) — never overwrites a value the
// user already set. Income rows keep category_id null on purpose (see
// TransactionRow's INCOME sentinel), so they're excluded here too.
export async function runVendorRulesNow(
  _prevState: { error: string; count: number } | null,
  _formData: FormData,
): Promise<{ error: string; count: number } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: uncategorized, error: fetchError } = await supabase
    .from("transactions")
    .select("id, merchant_normalized, source_id")
    .eq("user_id", user.id)
    .eq("is_transfer", false)
    .eq("is_income", false)
    .is("category_id", null)
    .not("merchant_normalized", "is", null);
  if (fetchError) return { error: fetchError.message, count: 0 };
  if (!uncategorized || uncategorized.length === 0) return { error: "", count: 0 };

  const { data: rules, error: rulesError } = await supabase
    .from("vendor_category_rules")
    .select("merchant_normalized, category_id, source_id")
    .eq("user_id", user.id);
  if (rulesError) return { error: rulesError.message, count: 0 };

  let count = 0;
  for (const txn of uncategorized) {
    const rule = findMatchingRule(rules ?? [], txn.merchant_normalized ?? "");
    if (!rule) continue;

    const patch: { category_id: string; category_source: string; source_id?: string } = {
      category_id: rule.category_id,
      category_source: "rule",
    };
    if (!txn.source_id && rule.source_id) patch.source_id = rule.source_id;

    const { error: updateError } = await supabase.from("transactions").update(patch).eq("id", txn.id);
    if (updateError) return { error: updateError.message, count };
    count += 1;
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { error: "", count };
}

export async function deleteVendorRule(
  ruleId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_category_rules").delete().eq("id", ruleId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return null;
}
