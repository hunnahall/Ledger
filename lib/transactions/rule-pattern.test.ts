import { describe, expect, it } from "vitest";
import { normalizeMerchant } from "./normalize-merchant";
import { parseRulePattern, rulePatternMatches } from "./rule-pattern";

function matches(input: string, description: string): boolean {
  const parsed = parseRulePattern(input);
  if ("error" in parsed) throw new Error(parsed.error);
  return rulePatternMatches(parsed.pattern, normalizeMerchant(description));
}

describe("parseRulePattern", () => {
  it("keeps a plain phrase identical to normalizeMerchant, with no regex", () => {
    expect(parseRulePattern("Trader Joe's #123")).toEqual({ pattern: normalizeMerchant("Trader Joe's #123"), regex: null });
  });

  it("treats lowercase and/or/not as words", () => {
    expect(parseRulePattern("Barnes and Noble")).toEqual({ pattern: "barnes and noble", regex: null });
  });

  it("prints a canonical form", () => {
    expect(parseRulePattern("(Uber OR Lyft) NOT eats")).toMatchObject({ pattern: "(uber OR lyft) AND NOT eats" });
    expect(parseRulePattern("a OR b AND c")).toMatchObject({ pattern: "a OR b AND c" });
    expect(parseRulePattern("NOT (a AND b) AND c")).toMatchObject({ pattern: "NOT (a AND b) AND c" });
  });

  it("rejects broken expressions", () => {
    for (const bad of ["apple AND", "OR apple", "(apple", "apple)", "AND", "()", "#123"]) {
      expect(parseRulePattern(bad)).toHaveProperty("error");
    }
  });

  it("rejects a pattern that would match everything", () => {
    expect(parseRulePattern("NOT amazon")).toHaveProperty("error");
    expect(parseRulePattern("*")).toHaveProperty("error");
    expect(parseRulePattern("apple OR NOT pear")).toHaveProperty("error");
  });

  it("reparses its own canonical form to the same thing", () => {
    for (const input of ["(uber OR lyft) AND NOT eats", "amzn*mktp", "a OR (b AND NOT (c OR d))"]) {
      const first = parseRulePattern(input);
      if ("error" in first) throw new Error(first.error);
      expect(parseRulePattern(first.pattern)).toEqual(first);
    }
  });
});

describe("rulePatternMatches", () => {
  it("matches a phrase anywhere in the description", () => {
    for (const d of ["apple xyz", "three apple", "apple 18992", "APPLE.COM/BILL"]) {
      expect(matches("apple", d)).toBe(true);
    }
    expect(matches("apple", "pear")).toBe(false);
  });

  it("handles AND, OR and NOT", () => {
    expect(matches("amazon AND prime", "amazon prime video")).toBe(true);
    expect(matches("amazon AND prime", "amazon marketplace")).toBe(false);
    expect(matches("uber OR lyft", "lyft ride 123")).toBe(true);
    expect(matches("uber AND NOT eats", "uber trip")).toBe(true);
    expect(matches("uber AND NOT eats", "uber eats")).toBe(false);
    expect(matches("(uber OR lyft) NOT eats", "lyft ride")).toBe(true);
    expect(matches("(uber OR lyft) NOT eats", "uber eats order")).toBe(false);
  });

  it("expands * to any run of characters", () => {
    expect(matches("amzn*mktp", "AMZN Mktp US*2K4")).toBe(true);
    expect(matches("amzn*mktp", "amznmktp")).toBe(true);
    expect(matches("amzn*mktp", "mktp amzn")).toBe(false);
    expect(matches("star*", "starbucks store")).toBe(true);
  });

  it("falls back to substring for stored plain patterns", () => {
    expect(rulePatternMatches("trader joe s", "tst trader joe s ca")).toBe(true);
    expect(rulePatternMatches("", "anything")).toBe(false);
  });
});
