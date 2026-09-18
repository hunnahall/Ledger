// Sentinel options in the rule forms' category select, same idea as the
// INCOME sentinel in the Transactions table's own Category select — let a
// rule mark matching transactions as Income, or as Excluded, instead of
// picking a real category (mutually exclusive — exactly one of category_id/
// is_income/is_exclude, see the vendor_category_rules_target_check
// constraint). Shared between the server actions that persist a rule and
// the client forms that pick its target — a "use server" file can only
// export async functions, so this plain constant/helper live here instead.
export const INCOME_RULE_TARGET = "__income__";
export const EXCLUDE_RULE_TARGET = "__exclude__";

export function resolveRuleTarget(
  formData: FormData,
): { categoryId: string | null; isIncome: boolean; isExclude: boolean } | { error: string } {
  const raw = String(formData.get("category_id") ?? "");
  if (!raw) return { error: "Choose a category." };
  if (raw === INCOME_RULE_TARGET) return { categoryId: null, isIncome: true, isExclude: false };
  if (raw === EXCLUDE_RULE_TARGET) return { categoryId: null, isIncome: false, isExclude: true };
  return { categoryId: raw, isIncome: false, isExclude: false };
}
