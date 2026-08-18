import { describe, expect, it } from "vitest";
import { computeDashboardTotals } from "./dashboard-metrics";

describe("computeDashboardTotals", () => {
  it("flips both raw outflow sums positive and nets them against inflow", () => {
    const result = computeDashboardTotals({
      inflow: 3000,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: -300,
    });
    expect(result).toEqual({
      inflow: 3000,
      budgetedOutflow: 1200,
      otherOutflow: 300,
      totalNet: 1500,
    });
  });

  it("treats a missing bucket (null, no rows that month) as zero outflow", () => {
    const result = computeDashboardTotals({
      inflow: 500,
      budgetedOutflowRaw: null,
      otherOutflowRaw: null,
    });
    expect(result.budgetedOutflow).toBe(0);
    expect(result.otherOutflow).toBe(0);
    expect(result.totalNet).toBe(500);
  });

  it("keeps totalNet exactly equal to inflow - budgetedOutflow - otherOutflow", () => {
    const result = computeDashboardTotals({
      inflow: 1000,
      budgetedOutflowRaw: -900,
      otherOutflowRaw: -250,
    });
    expect(result.totalNet).toBe(result.inflow - result.budgetedOutflow - result.otherOutflow);
    expect(result.totalNet).toBe(-150);
  });
});
