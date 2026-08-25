// A sentinel option in the rule forms' category select, same idea as the
// INCOME sentinel in the Transactions table's own Category select — lets a
// rule mark matching transactions as Income instead of picking a real
// category (mutually exclusive, see the vendor_category_rules_target_check
// constraint). Shared between the server actions that persist a rule and
// the client forms that pick its target — a "use server" file can only
// export async functions, so this plain constant/helper live here instead.
export const INCOME_RULE_TARGET = "__income__";

export function resolveRuleTarget(
  formData: FormData,
): { categoryId: string | null; isIncome: boolean } | { error: string } {
  const raw = String(formData.get("category_id") ?? "");
  if (!raw) return { error: "Choose a category." };
  if (raw === INCOME_RULE_TARGET) return { categoryId: null, isIncome: true };
  return { categoryId: raw, isIncome: false };
}
