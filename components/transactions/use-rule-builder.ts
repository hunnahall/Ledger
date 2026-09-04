"use client";

import { useCallback } from "react";
import { ruleExistsForDescription } from "@/lib/actions/transactions";

export const INCOME = "__income__";

type Option = { id: string; name: string };

// The "Add Rule" flow, lifted out of TransactionRow: deciding whether a
// category pick should also teach a vendor rule, and asking the user about
// it. Three call sites shared this and each carried part of the reasoning.
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
    async (targetCategoryId: string): Promise<string | undefined> => {
      const exists = await ruleExistsForDescription(description);
      if (exists) return undefined;

      const targetLabel =
        targetCategoryId === INCOME
          ? "Income"
          : (categories.find((c) => c.id === targetCategoryId)?.name ?? "this category");
      const saveRule = await confirm(`Make all "${description}" transactions ${targetLabel}?`);
      return saveRule ? "write" : "skip";
    },
    [description, categories, confirm],
  );

  // A category pick only warrants the prompt when it's genuinely new for
  // this row — re-picking what's already saved (or what a learned rule
  // already fills in) is reinforcement, not a decision.
  const isFreshPick = useCallback(
    ({
      nowIncome,
      newCategoryId,
      savedIsIncome,
      savedCategoryId,
    }: {
      nowIncome: boolean;
      newCategoryId: string;
      savedIsIncome: boolean;
      savedCategoryId: string | null;
    }) =>
      nowIncome ? !savedIsIncome : Boolean(newCategoryId) && newCategoryId !== (savedCategoryId ?? ""),
    [],
  );

  // A rule can target Income just like a real category (see the
  // vendor_category_rules.is_income column), but the two are stored
  // differently: category_id's hidden input still holds the raw INCOME
  // sentinel, which must not reach a uuid column.
  const overridesFor = useCallback(
    (categoryId: string): Record<string, string> => {
      const nowIncome = categoryId === INCOME;
      return {
        category_id: nowIncome ? "" : categoryId,
        is_income: nowIncome ? "on" : "",
      };
    },
    [],
  );

  return { resolveRuleAction, isFreshPick, overridesFor };
}
