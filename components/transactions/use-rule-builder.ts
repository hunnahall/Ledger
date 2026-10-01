"use client";

import { useCallback } from "react";
import { ruleExistsForDescription } from "@/lib/actions/transactions";

// Rule targets, shared by the "Add Rule" flow below (resolveRuleAction's
// label, and the target this row passes it — see handleToggleBuildRule and
// handleSourceChange in transaction-list.tsx, which is the only place these
// now get *picked*: Income lives on the Source select, Excluded on the same
// select's EXCLUDE_SOURCE sentinel).
export const INCOME = "__income__";
export const EXCLUDE = "__exclude__";

type Option = { id: string; name: string };

// The "Add Rule" flow, lifted out of TransactionRow: deciding whether a
// category/Income/Exclude pick should also teach a vendor rule, and asking
// the user about it. Three call sites shared this and each carried part of
// the reasoning.
//
// `resolveRuleAction` returns what to send as rule_action on the next save:
//   "write"  — user said yes, learn a rule for this merchant
//   "skip"   — user said no, leave vendor_category_rules alone
//   undefined — a rule already covers this merchant; assignTransaction
//               reinforces it by default, so there's nothing to decide.
export function useRuleBuilder({
  description,
  categories,
  confirm,
}: {
  description: string;
  categories: Option[];
  confirm: (message: string) => Promise<boolean>;
}) {
  const resolveRuleAction = useCallback(
    async (target: string): Promise<string | undefined> => {
      const exists = await ruleExistsForDescription(description);
      if (exists) return undefined;

      const targetLabel =
        target === INCOME
          ? "Income"
          : target === EXCLUDE
            ? "Excluded"
            : (categories.find((c) => c.id === target)?.name ?? "this category");
      const saveRule = await confirm(`Make all "${description}" transactions ${targetLabel}?`);
      return saveRule ? "write" : "skip";
    },
    [description, categories, confirm],
  );

  // A category pick only warrants the prompt when it's genuinely new for
  // this row — re-picking what's already saved (or what a learned rule
  // already fills in) is reinforcement, not a decision.
  const isFreshPick = useCallback(
    (newCategoryId: string, savedCategoryId: string | null) =>
      Boolean(newCategoryId) && newCategoryId !== (savedCategoryId ?? ""),
    [],
  );

  return { resolveRuleAction, isFreshPick };
}
