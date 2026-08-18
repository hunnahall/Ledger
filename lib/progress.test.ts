import { describe, expect, it } from "vitest";
import { computeProgress, spentFromRawAmount } from "./progress";

describe("spentFromRawAmount", () => {
  it("flips a negative raw sum (money out) to a positive spent magnitude", () => {
    expect(spentFromRawAmount(-42.5)).toBe(42.5);
  });

  it("flips a positive raw sum (refund month) to a negative spent value", () => {
    expect(spentFromRawAmount(15)).toBe(-15);
  });

  it("treats a missing row (null) as zero spent", () => {
    expect(spentFromRawAmount(null)).toBe(0);
  });
});

describe("computeProgress", () => {
  it("computes spent-under-budget", () => {
    const result = computeProgress({ total: 200, spent: 50 });
    expect(result).toEqual({ spent: 50, remaining: 150, pct: 25, over: false });
  });

  it("treats a zero total as 0% with no divide-by-zero", () => {
    const result = computeProgress({ total: 0, spent: 30 });
    expect(result.pct).toBe(0);
    expect(result.over).toBe(false);
  });

  it("clamps pct at 100 and flags over when spent exceeds total", () => {
    const result = computeProgress({ total: 100, spent: 150 });
    expect(result.pct).toBe(100);
    expect(result.over).toBe(true);
    expect(result.remaining).toBe(-50);
  });

  it("does not flag over for a refund month (negative spent)", () => {
    const result = computeProgress({ total: 100, spent: -20 });
    expect(result.pct).toBe(0);
    expect(result.over).toBe(false);
    expect(result.remaining).toBe(120);
  });
});
