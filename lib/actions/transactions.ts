"use server";

import { requireUser, type SupabaseServerClient } from "@/lib/supabase/auth";
import { revalidateLedgerPages, revalidateVendorRulePages } from "@/lib/actions/revalidate";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";
import { findMatchingRule } from "@/lib/transactions/match-vendor-rule";
import { MAX_SPLIT_ROWS } from "@/lib/transactions/splits";
import { parseMoney } from "@/lib/format";

export async function learnVendorRule(
  supabase: SupabaseServerClient,
  merchantNormalized: string,
  // Exactly one of these is the rule's target (see the
  // vendor_category_rules_target_check constraint) — a real category, or a
  // flag that marks matching transactions as Income instead.
  categoryId: string | null,
  isIncome: boolean,
  sourceId: string | null,
) {
  if (!merchantNormalized) return;

  // One atomic upsert. This used to be a select, then an insert, then a
  // hand-written 23505 recovery path for the race between them — and it
  // incremented use_count by reading it into JS and writing it back, so two
  // concurrent categorizations of the same merchant lost an increment.
  const { error } = await supabase.rpc("learn_vendor_rule", {
    p_merchant_normalized: merchantNormalized,
    p_category_id: categoryId,
    p_is_income: isIncome,
    p_source_id: sourceId,
  });

  // A failed rule write shouldn't block or crash the categorization it was
  // reinforcing — same reasoning as logChange's own error handling.
  if (error) console.error("learnVendorRule failed:", error.message);
}

export async function createManualTransaction(
  formData: FormData,
): Promise<{ error: string } | null> {
  const accountId = String(formData.get("account_id") ?? "");
  const postedDate = String(formData.get("posted_date") ?? "");
  const parsedAmount = parseMoney(formData.get("amount"), { positive: true });
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
  const transferFromSourceId = String(formData.get("transfer_from") ?? "") || null;
  const transferToSourceId = String(formData.get("transfer_to") ?? "") || null;
  // One dropdown picks the sign and the routing all at once. "exclude"
  // disregards category/source/budget entirely, not just the budget total.
  const typeChoice = String(formData.get("type_choice") ?? "expense");
  const isTransfer = typeChoice === "transfer";
  const isIncome = typeChoice === "income";
  const isExcluded = typeChoice === "exclude";
  const incomeAction = String(formData.get("income_action") ?? "include_in_budget");
  const newSourceName = String(formData.get("new_source_name") ?? "").trim();
  const newSourceType = String(formData.get("new_source_type") ?? "reimbursement");

  if (!accountId || !postedDate || !description) {
    return { error: "Fill in the account, date, description, and amount." };
  }
  // `Number("")` is 0, so the old Number.isNaN guard let an empty amount
  // through and inserted a $0 transaction.
  if ("error" in parsedAmount) return parsedAmount;
  const rawAmount = parsedAmount.amount;

  const { supabase, user } = await requireUser();

  const merchantNormalized = normalizeMerchant(description);

  let resolvedCategoryId = isTransfer || isExcluded ? null : categoryId;
  // A transfer's two buckets are synced by transactions_sync_transfer_balance
  // off transfer_from/to_*; also setting source_id would double-apply this
  // transaction's amount through the plain transactions_sync_balance trigger.
  let resolvedSourceId = isTransfer || isExcluded ? null : sourceId;
  // Every branch derives the sign from the chosen type rather than trusting
  // the submitted one — transfers used to pass rawAmount through unclamped,
  // so a negative transfer amount reversed the direction of both legs.
  const amount = isTransfer || isIncome ? Math.abs(rawAmount) : -Math.abs(rawAmount);

  if (isIncome && incomeAction === "include_in_budget") {
    // Tracked for inflow/filtering only (see v_inflow_outflow) — no source.
    resolvedSourceId = null;
  } else if (isIncome && incomeAction === "create_source") {
    if (newSourceType !== "reimbursement") {
      return { error: "Not a valid source type." };
    }
    if (!newSourceName) return { error: "Enter a name for the new source." };
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
    if (sourceError) return { error: sourceError.message };
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
    const { data: rules } = await supabase
      .from("vendor_category_rules")
      .select("merchant_normalized, category_id, source_id")
      .eq("user_id", user.id);
    const rule = findMatchingRule(rules ?? [], merchantNormalized);
    // Income-marking rules (category_id null) don't map onto this form —
    // it has no way to auto-select the Type field, only Category — so only
    // a rule with a real category applies here.
    if (rule?.category_id) {
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
    is_income: isIncome,
    exclude_from_budget: isExcluded,
    transfer_from_source_id: transferFromSourceId,
    transfer_to_source_id: transferToSourceId,
  });
  if (error) return { error: error.message };

  let learnedRule = false;
  if (resolvedCategoryId && ruleAction !== "skip") {
    await learnVendorRule(supabase, merchantNormalized, resolvedCategoryId, false, resolvedSourceId);
    learnedRule = true;
  }

  // A rule written here also has to show up on Settings, which has its own
  // cached route the ledger revalidation above doesn't touch.
  if (learnedRule) revalidateVendorRulePages();
  revalidateLedgerPages();
  return null;
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

  const { supabase, user } = await requireUser();

  const { data: rules } = await supabase
    .from("vendor_category_rules")
    .select("merchant_normalized, category_id, source_id, categories(name)")
    .eq("user_id", user.id);

  const rule = findMatchingRule(rules ?? [], merchantNormalized);
  if (!rule) return null;

  // Income-marking rules (category_id null) don't map onto this form — it
  // has no way to auto-select the Type field, only Category — so only a
  // rule with a real category is worth suggesting here.
  const categoryName = (rule.categories as { name: string } | null)?.name;
  if (!rule.category_id || !categoryName) return null;

  return { categoryId: rule.category_id, categoryName, sourceId: rule.source_id };
}

// Whether ANY rule already covers this description, category or Income
// alike — used to decide whether the "make this a rule?" prompt is worth
// showing (an existing rule just gets reinforced silently instead).
export async function ruleExistsForDescription(description: string): Promise<boolean> {
  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return false;

  const { supabase, user } = await requireUser();

  const { data: rules } = await supabase
    .from("vendor_category_rules")
    .select("merchant_normalized")
    .eq("user_id", user.id);

  return Boolean(findMatchingRule(rules ?? [], merchantNormalized));
}

export async function assignTransaction(
  transactionId: string,
  formData: FormData,
): Promise<{ error: string } | null> {
  const categoryId = String(formData.get("category_id") ?? "") || null;
  // See createManualTransaction — "skip" means the user was prompted to
  // save a new vendor rule for this merchant and declined.
  const ruleAction = String(formData.get("rule_action") ?? "");
  const sourceId = String(formData.get("source_id") ?? "") || null;
  const postedDate = String(formData.get("posted_date") ?? "") || null;
  const isTransfer = formData.get("is_transfer") === "on";
  const isIncome = formData.get("is_income") === "on";
  const excludeFromBudget = formData.get("exclude_from_budget") === "on";
  const notes = String(formData.get("notes") ?? "") || null;
  const transferFromSourceId = String(formData.get("transfer_from") ?? "") || null;
  const transferToSourceId = String(formData.get("transfer_to") ?? "") || null;

  const { supabase } = await requireUser();

  const { data: txn, error: fetchError } = await supabase
    .from("transactions")
    .select("merchant_normalized")
    .eq("id", transactionId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!txn) return { error: "Transaction not found." };

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
      ...(postedDate ? { posted_date: postedDate } : {}),
      is_transfer: isTransfer,
      is_income: !isTransfer && isIncome,
      exclude_from_budget: excludeFromBudget,
      notes,
      transfer_from_source_id: isTransfer ? transferFromSourceId : null,
      transfer_to_source_id: isTransfer ? transferToSourceId : null,
    })
    .eq("id", transactionId);
  if (error) return { error: error.message };

  let learnedRule = false;
  if (!isTransfer && (categoryId || isIncome) && txn.merchant_normalized && ruleAction !== "skip") {
    await learnVendorRule(supabase, txn.merchant_normalized, categoryId, isIncome, sourceId);
    learnedRule = true;
  }

  if (learnedRule) revalidateVendorRulePages();
  revalidateLedgerPages();
  return null;
}

// The "+ Add source" option in the Transactions list's Source column (see
// ADD_SOURCE in transaction-list.tsx) — mirrors the create-a-source block
// on the Sources page (name + type: past payment/future repayment/fund),
// seeded from this already-recorded transaction's own amount instead of a
// typed-in starting balance. Re-points this transaction's source_id at the
// new source; transactions_sync_balance (the DB trigger) picks up the
// change on this UPDATE the same way it would for any other source
// reassignment, crediting the transaction's amount to the new source and,
// if one was already linked, removing it from that one first.
export async function createSourceFromTransaction(
  transactionId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("new_source_name") ?? "").trim();
  const type = String(formData.get("new_source_type") ?? "reimbursement");
  if (!name) return { error: "Enter a name for the new source." };
  if (type !== "reimbursement" && type !== "fund") {
    return { error: "Not a valid source type." };
  }

  const { supabase, user } = await requireUser();

  const { data: txn, error: fetchError } = await supabase
    .from("transactions")
    .select("posted_date, is_transfer")
    .eq("id", transactionId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!txn) return { error: "Transaction not found." };
  if (txn.is_transfer) return { error: "Transfers can't be linked to a new source this way." };

  // Insert at balance 0 and let transactions_sync_balance apply this
  // transaction's amount below via source_id — inserting with balance
  // already set to the amount would double it once the trigger also runs
  // (same reasoning as createManualTransaction's "Create a Source" action).
  const { data: newSource, error: sourceError } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      name,
      type,
      balance: 0,
      deposit_date: type === "fund" ? null : txn.posted_date,
    })
    .select("id")
    .single();
  if (sourceError) return { error: sourceError.message };

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ source_id: newSource.id })
    .eq("id", transactionId);
  if (updateError) return { error: updateError.message };

  revalidateLedgerPages();
  return null;
}

export async function bulkUpdateTransactions(
  transactionIds: string[],
  updates: { categoryId?: string | null; sourceId?: string | null },
): Promise<{ error: string } | null> {
  if (transactionIds.length === 0) return null;

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
  if (Object.keys(patch).length === 0) return null;

  const { supabase } = await requireUser();

  // Transfers keep category_id/source_id null (see createManualTransaction) —
  // bulk edits skip them rather than risk double-applying transfer balances.
  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .in("id", transactionIds)
    .eq("is_transfer", false);
  if (error) return { error: error.message };

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
      await learnVendorRule(supabase, merchant, patch.category_id, false, txn.source_id);
    }
  }

  if (patch.category_id) revalidateVendorRulePages();
  revalidateLedgerPages();
  return null;
}

export async function deleteTransaction(
  transactionId: string,
): Promise<{ error: string } | null> {
  // RLS already scopes the delete, but without this an unauthenticated call
  // deleted nothing and reported success.
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .is("provider_transaction_id", null);
  if (error) return { error: error.message };

  revalidateLedgerPages();
  return null;
}

export async function saveSplits(
  transactionId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const { supabase } = await requireUser();

  const rows: { category_id: string | null; source_id: string | null; amount: number }[] = [];
  for (let i = 1; i <= MAX_SPLIT_ROWS; i++) {
    const parsed = parseMoney(formData.get(`split_amount_${i}`), { fallback: 0 });
    if ("error" in parsed) return { error: `Split ${i}: ${parsed.error}` };
    if (parsed.amount === 0) continue;
    rows.push({
      category_id: String(formData.get(`split_category_${i}`) ?? "") || null,
      source_id: String(formData.get(`split_source_${i}`) ?? "") || null,
      amount: parsed.amount,
    });
  }

  // One RPC rather than delete -> insert -> update is_split as three
  // separate round trips, each firing balance triggers: a failure part-way
  // through used to leave is_split wrong and the source balances drifted.
  // It also reads the transaction's own amount to check the split sum
  // against, instead of trusting a figure passed in from the client.
  const { error } = await supabase.rpc("save_transaction_splits", {
    p_transaction_id: transactionId,
    p_rows: rows,
  });
  if (error) return { error: error.message };

  revalidateLedgerPages();
  return null;
}
