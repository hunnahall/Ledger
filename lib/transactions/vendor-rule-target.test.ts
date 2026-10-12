import { describe, expect, it } from "vitest";
import {
  EXCLUDE_RULE_TARGET,
  INCOME_RULE_TARGET,
  SOURCE_RULE_TARGET_PREFIX,
  resolveRuleTarget,
  ruleTargetValue,
} from "./vendor-rule-target";

function formData(categoryId: string | null) {
  const data = new FormData();
  if (categoryId !== null) data.set("category_id", categoryId);
  return data;
}

const none = { categoryId: null, isIncome: false, isExclude: false, sourceId: null };

// vendor_category_rules_target_check requires exactly one of (category_id,
// is_income, is_exclude), or none of them plus a source_id — this is what
// keeps the targets mutually exclusive.
describe("resolveRuleTarget", () => {
  it("maps the Income sentinel to the is_income flag, with no category", () => {
    expect(resolveRuleTarget(formData(INCOME_RULE_TARGET))).toEqual({ ...none, isIncome: true });
  });

  it("maps the Exclude sentinel to the is_exclude flag, with no category", () => {
    expect(resolveRuleTarget(formData(EXCLUDE_RULE_TARGET))).toEqual({ ...none, isExclude: true });
  });

  it("maps a real category id to a category target", () => {
    expect(resolveRuleTarget(formData("cat-1"))).toEqual({ ...none, categoryId: "cat-1" });
  });

  it("maps a prefixed source id to a source-only target", () => {
    expect(resolveRuleTarget(formData(SOURCE_RULE_TARGET_PREFIX + "src-1"))).toEqual({
      ...none,
      sourceId: "src-1",
    });
  });

  it("rejects a missing or empty selection", () => {
    const error = { error: "Choose a category or source." };
    expect(resolveRuleTarget(formData(null))).toEqual(error);
    expect(resolveRuleTarget(formData(""))).toEqual(error);
    expect(resolveRuleTarget(formData(SOURCE_RULE_TARGET_PREFIX))).toEqual(error);
  });
});

describe("ruleTargetValue", () => {
  it("round-trips every target through resolveRuleTarget", () => {
    for (const value of [
      INCOME_RULE_TARGET,
      EXCLUDE_RULE_TARGET,
      "cat-1",
      SOURCE_RULE_TARGET_PREFIX + "src-1",
    ]) {
      const target = resolveRuleTarget(formData(value));
      if ("error" in target) throw new Error(target.error);
      expect(ruleTargetValue(target)).toBe(value);
    }
  });

  it("prefers the category over a category rule's secondary source", () => {
    expect(ruleTargetValue({ ...none, categoryId: "cat-1", sourceId: "src-1" })).toBe("cat-1");
  });
});
