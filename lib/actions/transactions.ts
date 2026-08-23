"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";
import { decodeBucketOption } from "@/lib/transactions/bucket-option";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function learnVendorRule(
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
    return;
  }

  const { error } = await supabase.from("vendor_category_rules").insert({
    user_id: userId,
    merchant_normalized: merchantNormalized,
    category_id: categoryId,
    source_id: sourceId,
  });

  // Unique violation (see the vendor_category_rules_user_merchant_key
  // constraint) means a concurrent call already created the rule between
  // our select above and this insert — fall back to updating it instead of
  // erroring out or leaving a duplicate row for the same merchant.
  if (error?.code === "23505") {
    const { data: race } = await supabase
      .from("vendor_category_rules")
      .select("id, use_count")
      .eq("user_id", userId)
      .eq("merchant_normalized", merchantNormalized)
      .maybeSingle();
    if (race) {
      await supabase
        .from("vendor_category_rules")
        .update({
          category_id: categoryId,
          source_id: sourceId,
          last_used_at: new Date().toISOString(),
          use_count: race.use_count + 1,
        })
        .eq("id", race.id);
    }
  } else if (error) {
    throw new Error(error.message);
  }
}

export async function createManualTransaction(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "");
  const postedDate = String(formData.get("posted_date") ?? "");
  const rawAmount = Number(formData.get("amount") ?? NaN);
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const categoryFieldSource = String(formData.get("category_source") ?? "");
  // Set by the form when the user was prompted to save a new vendor rule and
  // declined — "skip" means don't touch vendor_category_rules this time.
  // Left unset (defaults to writing) when accepting an auto-fill or when a
  // rule already covers this merchant, since that's reinforcement, not the
  // one-off-merchant noise the prompt exists to avoid.
  const ruleAction = String(formData.get("rule_action") ?? "");
  const sourceId = String(formData.get("source_id") ?? "") || null;
  const transferFrom = decodeBucketOption(formData.get("transfer_from"));
  const transferTo = decodeBucketOption(formData.get("transfer_to"));
  // One dropdown picks the sign and the routing all at once. "exclude"
  // disregards category/source/budget entirely, not just the budget total.
  const typeChoice = String(formData.get("type_choice") ?? "expense");
  const isTransfer = typeChoice === "transfer";
  const isIncome = typeChoice === "income";
  const isExcluded = typeChoice === "exclude";
  const incomeAction = String(formData.get("income_action") ?? "include_in_budget");
  const newSourceName = String(formData.get("new_source_name") ?? "").trim();
  const newSourceType = String(formData.get("new_source_type") ?? "past_payment");

  if (!accountId || !postedDate || !description || Number.isNaN(rawAmount)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const merchantNormalized = normalizeMerchant(description);

  let resolvedCategoryId = isTransfer || isExcluded ? null : categoryId;
  // A transfer's two buckets are synced by transactions_sync_transfer_balance
  // off transfer_from/to_*; also setting source_id would double-apply this
  // transaction's amount through the plain transactions_sync_balance trigger.
  let resolvedSourceId = isTransfer || isExcluded ? null : sourceId;
  const amount = isTransfer ? rawAmount : isIncome ? Math.abs(rawAmount) : -Math.abs(rawAmount);

  if (isIncome && incomeAction === "include_in_budget") {
    // Tracked for inflow/filtering only (see v_inflow_outflow) — no source.
    resolvedSourceId = null;
  } else if (isIncome && incomeAction === "create_source") {
    if (newSourceType !== "past_payment" && newSourceType !== "future_repayment") {
      throw new Error("Not a valid source type.");
    }
    if (!newSourceName) throw new Error("Enter a name for the new source.");
    // Insert at balance 0 and let transactions_sync_balance apply `amount`
    // below via source_id — inserting with balance already set to the
    // amount would double it once the trigger also runs.
    const { data: newSource, error: sourceError } = await supabase
      .from("sources")
      .insert({
        user_id: user.id,
        name: newSourceName,
        type: newSourceType,
        balance: 0,
        deposit_date: postedDate,
      })
      .select("id")
      .single();
    if (sourceError) throw new Error(sourceError.message);
    resolvedSourceId = newSource.id;
  }
  // "add_to_source" (and plain expenses) keep resolvedSourceId = sourceId,
  // already set above — transactions_sync_balance applies it same as any
  // other source-linked transaction.

  // Tracks whether the category came from the user's own pick or was
  // filled from a learned rule, so the transaction list can show which one
  // happened instead of leaving auto-fill invisible. The form already
  // auto-fills the select from a rule as the user types the description
  // (see ManualTransactionForm), flagging that fill via category_source —
  // trust that hint instead of assuming any non-empty category was manual.
  let categorySource: "manual" | "rule" | null = resolvedCategoryId
    ? categoryFieldSource === "auto"
      ? "rule"
      : "manual"
    : null;

  if (!isTransfer && !isExcluded && !resolvedCategoryId && merchantNormalized) {
    const { data: rule } = await supabase
      .from("vendor_category_rules")
      .select("category_id, source_id")
      .eq("user_id", user.id)
      .eq("merchant_normalized", merchantNormalized)
      .maybeSingle();
    if (rule) {
      resolvedCategoryId = rule.category_id;
      resolvedSourceId = resolvedSourceId ?? rule.source_id;
      categorySource = "rule";
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
    category_source: categorySource,
    is_transfer: isTransfer,
    exclude_from_budget: isExcluded,
    transfer_from_source_id: transferFrom?.type === "source" ? transferFrom.id : null,
    transfer_from_fund_id: transferFrom?.type === "fund" ? transferFrom.id : null,
    transfer_to_source_id: transferTo?.type === "source" ? transferTo.id : null,
    transfer_to_fund_id: transferTo?.type === "fund" ? transferTo.id : null,
  });
  if (error) throw new Error(error.message);

  if (resolvedCategoryId && ruleAction !== "skip") {
    await learnVendorRule(supabase, user.id, merchantNormalized, resolvedCategoryId, resolvedSourceId);
  }

  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/dashboard");
}

// Looks up whether a description would match a learned vendor rule, so the
// manual-entry form can auto-fill the category select as the user types —
// same lookup createManualTransaction falls back to server-side if the
// client-set category_id didn't make it into the submitted form.
export async function suggestCategoryForDescription(
  description: string,
): Promise<{ categoryId: string; categoryName: string; sourceId: string | null } | null> {
  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rule } = await supabase
    .from("vendor_category_rules")
    .select("category_id, source_id, categories(name)")
    .eq("user_id", user.id)
    .eq("merchant_normalized", merchantNormalized)
    .maybeSingle();
  if (!rule) return null;

  const categoryName = (rule.categories as { name: string } | null)?.name;
  if (!categoryName) return null;

  return { categoryId: rule.category_id, categoryName, sourceId: rule.source_id };
}

export async function assignTransaction(transactionId: string, formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "") || null;
  // See createManualTransaction — "skip" means the user was prompted to
  // save a new vendor rule for this merchant and declined.
  const ruleAction = String(formData.get("rule_action") ?? "");
  const sourceId = String(formData.get("source_id") ?? "") || null;
  const isTransfer = formData.get("is_transfer") === "on";
  const excludeFromBudget = formData.get("exclude_from_budget") === "on";
  const notes = String(formData.get("notes") ?? "") || null;
  const transferFrom = decodeBucketOption(formData.get("transfer_from"));
  const transferTo = decodeBucketOption(formData.get("transfer_to"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: txn, error: fetchError } = await supabase
    .from("transactions")
    .select("merchant_normalized")
    .eq("id", transactionId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!txn) throw new Error("Transaction not found.");

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: isTransfer ? null : categoryId,
      // Explicit choice via this form, as opposed to a rule's silent
      // auto-fill on manual entry — see createManualTransaction.
      category_source: !isTransfer && categoryId ? "manual" : null,
      // See createManualTransaction: a transfer's buckets are synced via
      // transfer_from/to_*, so source_id must stay null to avoid double-
      // applying this transaction's amount through the plain sync trigger.
      source_id: isTransfer ? null : sourceId,
      is_transfer: isTransfer,
      exclude_from_budget: excludeFromBudget,
      notes,
      transfer_from_source_id: isTransfer && transferFrom?.type === "source" ? transferFrom.id : null,
      transfer_from_fund_id: isTransfer && transferFrom?.type === "fund" ? transferFrom.id : null,
      transfer_to_source_id: isTransfer && transferTo?.type === "source" ? transferTo.id : null,
      transfer_to_fund_id: isTransfer && transferTo?.type === "fund" ? transferTo.id : null,
    })
    .eq("id", transactionId);
  if (error) throw new Error(error.message);

  if (!isTransfer && categoryId && txn.merchant_normalized && ruleAction !== "skip") {
    await learnVendorRule(supabase, user.id, txn.merchant_normalized, categoryId, sourceId);
  }

  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/dashboard");
}

export async function bulkUpdateTransactions(
  transactionIds: string[],
  updates: { categoryId?: string | null; sourceId?: string | null },
) {
  if (transactionIds.length === 0) return;

  const patch: {
    category_id?: string | null;
    category_source?: "manual" | null;
    source_id?: string | null;
  } = {};
  if (updates.categoryId !== undefined) {
    patch.category_id = updates.categoryId;
    patch.category_source = updates.categoryId ? "manual" : null;
  }
  if (updates.sourceId !== undefined) patch.source_id = updates.sourceId;
  if (Object.keys(patch).length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Transfers keep category_id/source_id null (see createManualTransaction) —
  // bulk edits skip them rather than risk double-applying transfer balances.
  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .in("id", transactionIds)
    .eq("is_transfer", false);
  if (error) throw new Error(error.message);

  // Reinforce learned rules the same way manual entry/assignment do, so a
  // bulk categorization isn't a dead end for future auto-categorization.
  if (patch.category_id) {
    const { data: affected } = await supabase
      .from("transactions")
      .select("merchant_normalized, source_id")
      .in("id", transactionIds)
      .eq("is_transfer", false)
      .not("merchant_normalized", "is", null);
    const seen = new Set<string>();
    for (const txn of affected ?? []) {
      const merchant = txn.merchant_normalized;
      if (!merchant || seen.has(merchant)) continue;
      seen.add(merchant);
      await learnVendorRule(supabase, user.id, merchant, patch.category_id, txn.source_id);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .is("provider_transaction_id", null);
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

  if (rows.length > 0) {
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    if (Math.round(total * 100) !== Math.round(transactionAmount * 100)) {
      throw new Error(
        `Split amounts (${total.toFixed(2)}) must sum to the transaction amount (${transactionAmount.toFixed(2)}).`,
      );
    }
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
