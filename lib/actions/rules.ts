"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { revalidateRulePages } from "@/lib/actions/revalidate";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";
import { resolveRuleTarget } from "@/lib/transactions/rule-target";
import { learnRule } from "@/lib/actions/transactions";
import { logChange } from "@/lib/actions/log";

export async function createRule(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const description = String(formData.get("merchant") ?? "").trim();
  if (!description) return { error: "Enter a merchant name." };

  const target = resolveRuleTarget(formData);
  if ("error" in target) return target;

  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return { error: "Enter a merchant name." };

  const { supabase } = await requireUser();

  await learnRule(
    supabase,
    merchantNormalized,
    target.categoryId,
    target.isIncome,
    target.sourceId,
    target.isExclude,
  );

  revalidatePath("/settings");
  return null;
}

export async function updateRule(
  ruleId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const description = String(formData.get("merchant") ?? "").trim();
  if (!description) return { error: "Enter a merchant pattern." };

  const target = resolveRuleTarget(formData);
  if ("error" in target) return target;

  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return { error: "Enter a merchant pattern." };

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("rules")
    .update({
      merchant_normalized: merchantNormalized,
      category_id: target.categoryId,
      is_income: target.isIncome,
      is_exclude: target.isExclude,
      // A category rule's source_id is a secondary fill-in learned from the
      // Transactions page, which this form doesn't show — leave it as is.
      // Every other target owns source_id outright (null for Income/
      // Excluded, the target itself for a source rule).
      ...(target.categoryId ? {} : { source_id: target.sourceId }),
    })
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
// the next sync. Only fills in category_id/is_income (and source_id when
// the transaction doesn't already have one) — never overwrites a value the
// user already set. A row already marked Income is left alone entirely —
// re-deriving it from a category rule would wrongly strip that flag, and
// re-applying an Income rule to it would be a no-op anyway.
export async function runRulesNow(
  _prevState: { error: string; count: number } | null,
  _formData: FormData,
): Promise<{ error: string; count: number } | null> {
  const { supabase } = await requireUser();

  // One set-based UPDATE in the database rather than a fetch-then-loop that
  // issued an UPDATE per transaction — and that aborted the whole batch on
  // the first failing row, reporting a partial count with no indication of
  // which rows had been done. The matching rules (longest pattern wins,
  // substring match, already-Income rows left alone) live in
  // apply_rules and are shared with the simplefin-sync edge function,
  // which used to carry its own copy of the same loop.
  const { data, error } = await supabase.rpc("apply_rules");
  if (error) return { error: error.message, count: 0 };

  revalidateRulePages();
  return { error: "", count: data ?? 0 };
}

export async function deleteRule(
  ruleId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  // Without this an unauthenticated call deleted nothing under RLS and
  // reported success.
  const { supabase, user } = await requireUser();
  const { data: deleted, error } = await supabase
    .from("rules")
    .delete()
    .eq("id", ruleId)
    .select("merchant_normalized, category_id, is_income, is_exclude, categories(name), sources(name)")
    .maybeSingle();
  if (error) return { error: error.message };

  // New rules are logged inside learn_rule itself (every way a rule
  // gets made goes through it); deletes only ever happen here.
  if (deleted) {
    const target = deleted.is_income
      ? "Income"
      : deleted.is_exclude
        ? "Excluded"
        : deleted.category_id
          ? ((deleted.categories as { name: string } | null)?.name ?? "Category")
          : `Source: ${(deleted.sources as { name: string } | null)?.name ?? "—"}`;
    await logChange(supabase, user.id, "Rules", `Rule: ${deleted.merchant_normalized}`, target, null);
  }

  revalidatePath("/settings");
  return null;
}
