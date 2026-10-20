import { describe, expect, it } from "vitest";
import { goalMonthlyAmount, monthlySinkingAmount } from "./sinking";

describe("monthlySinkingAmount", () => {
  it("divides an annual payment by 12", () => {
    expect(monthlySinkingAmount(1200, "annual")).toBe(100);
  });

  it("divides a semiannual payment by 6", () => {
    expect(monthlySinkingAmount(1200, "semiannual")).toBe(200);
  });

  it("divides a quarterly payment by 3", () => {
    expect(monthlySinkingAmount(300, "quarterly")).toBe(100);
  });
});

describe("goalMonthlyAmount", () => {
  it("spreads what's left to save over the months remaining", () => {
    expect(goalMonthlyAmount(1200, 0, 12)).toBe(100);
  });

  it("subtracts what's already saved in the linked fund", () => {
    expect(goalMonthlyAmount(1200, 200, 10)).toBe(100);
  });

  it("floors at 0 once the goal is already met", () => {
    expect(goalMonthlyAmount(1000, 1500, 6)).toBe(0);
  });
});
