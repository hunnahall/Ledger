import { describe, expect, it } from "vitest";
import { INCOME_RULE_TARGET, resolveRuleTarget } from "./vendor-rule-target";

function formData(categoryId: string | null) {
  const data = new FormData();
  if (categoryId !== null) data.set("category_id", categoryId);
  return data;
}

// vendor_category_rules_target_check requires exactly one of (category_id,
// is_income) — this is what keeps the two mutually exclusive.
describe("resolveRuleTarget", () => {
  it("maps the Income sentinel to the is_income flag, with no category", () => {
    expect(resolveRuleTarget(formData(INCOME_RULE_TARGET))).toEqual({
      categoryId: null,
      isIncome: true,
    });
  });

  it("maps a real category id to a category target", () => {
    expect(resolveRuleTarget(formData("cat-1"))).toEqual({ categoryId: "cat-1", isIncome: false });
  });

  it("rejects a missing or empty selection", () => {
    expect(resolveRuleTarget(formData(null))).toEqual({ error: "Choose a category." });
    expect(resolveRuleTarget(formData(""))).toEqual({ error: "Choose a category." });
  });
});
