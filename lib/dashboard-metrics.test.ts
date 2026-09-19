import { describe, expect, it } from "vitest";
import { computeDashboardTotals } from "./dashboard-metrics";

describe("computeDashboardTotals", () => {
  it("flips both raw outflow sums positive and nets totalNet against income + other inflow", () => {
    const result = computeDashboardTotals({
      income: 2500,
      otherInflow: 500,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: -300,
      categorizedIncome: 0,
      totalAllocation: 8260,
    });
    expect(result).toEqual({
      income: 2500,
      otherInflow: 500,
      budgetedOutflow: 1200,
      otherOutflow: 300,
      categorizedIncome: 0,
      totalAllocation: 8260,
      budgetNet: 7060,
      totalNet: 1500,
    });
  });

  it("treats a missing bucket (null, no rows that month) as zero outflow", () => {
    const result = computeDashboardTotals({
      income: 500,
      otherInflow: 0,
      budgetedOutflowRaw: null,
      otherOutflowRaw: null,
      categorizedIncome: 0,
      totalAllocation: 1000,
    });
    expect(result.budgetedOutflow).toBe(0);
    expect(result.otherOutflow).toBe(0);
    expect(result.budgetNet).toBe(1000);
    expect(result.totalNet).toBe(500);
  });

  it("keeps totalNet exactly equal to (income + otherInflow) - (budgetedOutflow + otherOutflow), independent of categorizedIncome/totalAllocation", () => {
    const result = computeDashboardTotals({
      income: 800,
      otherInflow: 200,
      budgetedOutflowRaw: -900,
      otherOutflowRaw: -250,
      categorizedIncome: 150,
      totalAllocation: 5000,
    });
    expect(result.totalNet).toBe(
      result.income + result.otherInflow - result.budgetedOutflow - result.otherOutflow,
    );
    expect(result.totalNet).toBe(-150);
  });

  it("keeps budgetNet exactly equal to totalAllocation - budgetedOutflow + categorizedIncome, independent of income/other inflow/outflow", () => {
    const result = computeDashboardTotals({
      income: 3000,
      otherInflow: 10000,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: -9000,
      categorizedIncome: 0,
      totalAllocation: 2000,
    });
    expect(result.budgetNet).toBe(800);
  });

  it("adds categorizedIncome (a paycheck/reimbursement filed under a category instead of flagged Income) into budgetNet only", () => {
    const result = computeDashboardTotals({
      income: 2500,
      otherInflow: 0,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: 0,
      categorizedIncome: 400,
      totalAllocation: 8260,
    });
    expect(result.budgetNet).toBe(7460);
    expect(result.totalNet).toBe(1300);
  });

  it("budgetNet does not move with income — only totalAllocation, budgetedOutflow, categorizedIncome do", () => {
    const withLowIncome = computeDashboardTotals({
      income: 0,
      otherInflow: 0,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: 0,
      categorizedIncome: 0,
      totalAllocation: 8260,
    });
    const withHighIncome = computeDashboardTotals({
      income: 50000,
      otherInflow: 0,
      budgetedOutflowRaw: -1200,
      otherOutflowRaw: 0,
      categorizedIncome: 0,
      totalAllocation: 8260,
    });
    expect(withLowIncome.budgetNet).toBe(withHighIncome.budgetNet);
    expect(withLowIncome.budgetNet).toBe(7060);
  });
});
