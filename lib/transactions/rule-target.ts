// Sentinel options in the rule forms' category select, same idea as the
// INCOME sentinel in the Transactions table's own Category select — let a
// rule mark matching transactions as Income, or as Excluded, instead of
// picking a real category (mutually exclusive — exactly one of category_id/
// is_income/is_exclude, see the rules_target_check
// constraint). Shared between the server actions that persist a rule and
// the client forms that pick its target — a "use server" file can only
// export async functions, so this plain constant/helper live here instead.
export const INCOME_RULE_TARGET = "__income__";
export const EXCLUDE_RULE_TARGET = "__exclude__";
// A Source as the rule's whole target (no category) — the select's value is
// this prefix plus the source id, kept apart from category ids that way.
export const SOURCE_RULE_TARGET_PREFIX = "source:";

type RuleTarget = {
  categoryId: string | null;
  isIncome: boolean;
  isExclude: boolean;
  sourceId: string | null;
};

export function resolveRuleTarget(formData: FormData): RuleTarget | { error: string } {
  const raw = String(formData.get("category_id") ?? "");
  const none = { categoryId: null, isIncome: false, isExclude: false, sourceId: null };
  if (!raw) return { error: "Choose a category or source." };
  if (raw === INCOME_RULE_TARGET) return { ...none, isIncome: true };
  if (raw === EXCLUDE_RULE_TARGET) return { ...none, isExclude: true };
  if (raw.startsWith(SOURCE_RULE_TARGET_PREFIX)) {
    const sourceId = raw.slice(SOURCE_RULE_TARGET_PREFIX.length);
    if (!sourceId) return { error: "Choose a category or source." };
    return { ...none, sourceId };
  }
  return { ...none, categoryId: raw };
}

// The select value that represents a stored rule's target — inverse of
// resolveRuleTarget, for pre-selecting the edit form.
export function ruleTargetValue(rule: RuleTarget): string {
  if (rule.isIncome) return INCOME_RULE_TARGET;
  if (rule.isExclude) return EXCLUDE_RULE_TARGET;
  if (rule.categoryId) return rule.categoryId;
  return rule.sourceId ? SOURCE_RULE_TARGET_PREFIX + rule.sourceId : "";
}

// The Transactions Source select's "Transfer to <Source>" options: this
// prefix plus the destination Source's id (see markTransfer).
export const TRANSFER_TARGET_PREFIX = "transfer:";
