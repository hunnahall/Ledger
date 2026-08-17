"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function learnVendorRule(
  supabase: SupabaseServerClient,
  userId: string,
  merchantNormalized: string,
  categoryId: string,
  sourceId: string | null,
) {
  if (!merchantNormalized) return;

  const { data: existing } = await supabase
    .from("vendor_category_rules")
    .select("id, use_count")
    .eq("user_id", userId)
    .eq("merchant_normalized", merchantNormalized)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("vendor_category_rules")
      .update({
        category_id: categoryId,
        source_id: sourceId,
        last_used_at: new Date().toISOString(),
        use_count: existing.use_count + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("vendor_category_rules").insert({
      user_id: userId,
      merchant_normalized: merchantNormalized,
      category_id: categoryId,
      source_id: sourceId,
    });
  }
}

export async function createManualTransaction(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "");
  const postedDate = String(formData.get("posted_date") ?? "");
  const amount = Number(formData.get("amount") ?? NaN);
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const sourceId = String(formData.get("source_id") ?? "") || null;

  if (!accountId || !postedDate || !description || Number.isNaN(amount)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const merchantNormalized = normalizeMerchant(description);

  let resolvedCategoryId = categoryId;
  let resolvedSourceId = sourceId;

  if (!resolvedCategoryId && merchantNormalized) {
    const { data: rule } = await supabase
      .from("vendor_category_rules")
      .select("category_id, source_id")
      .eq("user_id", user.id)
      .eq("merchant_normalized", merchantNormalized)
      .maybeSingle();
    if (rule) {
      resolvedCategoryId = rule.category_id;
      resolvedSourceId = resolvedSourceId ?? rule.source_id;
    }
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: accountId,
    posted_date: postedDate,
    amount,
    description,
    merchant_normalized: merchantNormalized,
    category_id: resolvedCategoryId,
    source_id: resolvedSourceId,
  });
  if (error) throw new Error(error.message);

  if (resolvedCategoryId) {
    await learnVendorRule(supabase, user.id, merchantNormalized, resolvedCategoryId, resolvedSourceId);
  }

  revalidatePath("/transactions");
}

export async function assignTransaction(transactionId: string, formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const sourceId = String(formData.get("source_id") ?? "") || null;
  const isTransfer = formData.get("is_transfer") === "on";
  const excludeFromBudget = formData.get("exclude_from_budget") === "on";
  const notes = String(formData.get("notes") ?? "") || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: txn, error: fetchError } = await supabase
    .from("transactions")
    .select("merchant_normalized")
    .eq("id", transactionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: isTransfer ? null : categoryId,
      source_id: sourceId,
      is_transfer: isTransfer,
      exclude_from_budget: excludeFromBudget,
      notes,
    })
    .eq("id", transactionId);
  if (error) throw new Error(error.message);

  if (!isTransfer && categoryId && txn.merchant_normalized) {
    await learnVendorRule(supabase, user.id, txn.merchant_normalized, categoryId, sourceId);
  }

  revalidatePath("/transactions");
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .is("teller_transaction_id", null);
  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
}

const MAX_SPLIT_ROWS = 4;

export async function saveSplits(
  transactionId: string,
  transactionAmount: number,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows: { category_id: string | null; source_id: string | null; amount: number }[] = [];
  for (let i = 1; i <= MAX_SPLIT_ROWS; i++) {
    const amount = Number(formData.get(`split_amount_${i}`) ?? 0);
    if (!amount) continue;
    rows.push({
      category_id: String(formData.get(`split_category_${i}`) ?? "") || null,
      source_id: String(formData.get(`split_source_${i}`) ?? "") || null,
      amount,
    });
  }

  const { error: deleteError } = await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length === 0) {
    const { error } = await supabase
      .from("transactions")
      .update({ is_split: false })
      .eq("id", transactionId);
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    return;
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  if (Math.round(total * 100) !== Math.round(transactionAmount * 100)) {
    throw new Error(
      `Split amounts (${total.toFixed(2)}) must sum to the transaction amount (${transactionAmount.toFixed(2)}).`,
    );
  }

  const { error: insertError } = await supabase.from("transaction_splits").insert(
    rows.map((r) => ({
      user_id: user.id,
      transaction_id: transactionId,
      category_id: r.category_id,
      source_id: r.source_id,
      amount: r.amount,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ is_split: true })
    .eq("id", transactionId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/transactions");
}
