import { describe, expect, it } from "vitest";
import { computeDashboardTotals } from "./dashboard-metrics";

describe("computeDashboardTotals", () => {
  it("flips both raw outflow sums positive and nets them against income + other inflow", () => {
    const result = computeDashboardTotals({
      income: 2500,
      otherInflow: 500,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: -300,
    });
    expect(result).toEqual({
      income: 2500,
      otherInflow: 500,
      budgetedOutflow: 1200,
      otherOutflow: 300,
      budgetNet: 1300,
      totalNet: 1500,
    });
  });

  it("treats a missing bucket (null, no rows that month) as zero outflow", () => {
    const result = computeDashboardTotals({
      income: 500,
      otherInflow: 0,
      budgetedOutflowRaw: null,
      otherOutflowRaw: null,
    });
    expect(result.budgetedOutflow).toBe(0);
    expect(result.otherOutflow).toBe(0);
    expect(result.budgetNet).toBe(500);
    expect(result.totalNet).toBe(500);
  });

  it("keeps totalNet exactly equal to (income + otherInflow) - (budgetedOutflow + otherOutflow)", () => {
    const result = computeDashboardTotals({
      income: 800,
      otherInflow: 200,
      budgetedOutflowRaw: -900,
      otherOutflowRaw: -250,
    });
    expect(result.totalNet).toBe(
      result.income + result.otherInflow - result.budgetedOutflow - result.otherOutflow,
    );
    expect(result.totalNet).toBe(-150);
  });

  it("keeps budgetNet exactly equal to income - budgetedOutflow, independent of other inflow/outflow", () => {
    const result = computeDashboardTotals({
      income: 3000,
      otherInflow: 10000,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: -9000,
    });
    expect(result.budgetNet).toBe(1800);
  });
});
