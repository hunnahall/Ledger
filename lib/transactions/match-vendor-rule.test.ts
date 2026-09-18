import { describe, expect, it } from "vitest";
import { findMatchingRule } from "./match-vendor-rule";

describe("findMatchingRule", () => {
  it("matches a rule whose pattern is a substring of the description, not just an exact match", () => {
    const rules = [{ merchant_normalized: "target" }];
    expect(findMatchingRule(rules, "tsx target checkout")).toEqual({ merchant_normalized: "target" });
  });

  it("still matches an exact equal description", () => {
    const rules = [{ merchant_normalized: "target" }];
    expect(findMatchingRule(rules, "target")).toEqual({ merchant_normalized: "target" });
  });

  it("returns null when no rule's pattern appears in the description", () => {
    const rules = [{ merchant_normalized: "target" }];
    expect(findMatchingRule(rules, "trader joes")).toBeNull();
  });

  it("prefers the longest matching pattern when more than one rule matches", () => {
    const rules = [{ merchant_normalized: "coffee" }, { merchant_normalized: "jedidiah coffee" }];
    expect(findMatchingRule(rules, "tst jedidiah coffee ne")).toEqual({
      merchant_normalized: "jedidiah coffee",
    });
  });

  it("returns null for an empty rule list", () => {
    expect(findMatchingRule([], "target")).toBeNull();
  });
});
