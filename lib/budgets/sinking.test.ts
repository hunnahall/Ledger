import { describe, expect, it } from "vitest";
import { monthlySinkingAmount } from "./sinking";

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
