import { describe, expect, it } from "vitest";
import { computeDashboardTotals } from "./dashboard-metrics";

describe("computeDashboardTotals", () => {
  it("flips both raw outflow sums positive and nets cashFlow against income + other inflow", () => {
    const result = computeDashboardTotals({
      income: 2500,
      otherInflows: 500,
      expenseRaw: -1200,
      otherOutflowsRaw: -300,
      categorizedIncome: 0,
      allocation: 8260,
    });
    expect(result).toEqual({
      income: 2500,
      otherInflows: 500,
      inflows: 3000,
      expense: 1200,
      otherOutflows: 300,
      outflows: 1500,
      categorizedIncome: 0,
      allocation: 8260,
      budgetNet: 7060,
      cashFlow: 1500,
    });
  });

  it("treats a missing bucket (null, no rows that month) as zero outflow", () => {
    const result = computeDashboardTotals({
      income: 500,
      otherInflows: 0,
      expenseRaw: null,
      otherOutflowsRaw: null,
      categorizedIncome: 0,
      allocation: 1000,
    });
    expect(result.expense).toBe(0);
    expect(result.otherOutflows).toBe(0);
    expect(result.budgetNet).toBe(1000);
    expect(result.cashFlow).toBe(500);
  });

  it("keeps cashFlow exactly equal to (income + otherInflows) - (expense + otherOutflows), independent of categorizedIncome/allocation", () => {
    const result = computeDashboardTotals({
      income: 800,
      otherInflows: 200,
      expenseRaw: -900,
      otherOutflowsRaw: -250,
      categorizedIncome: 150,
      allocation: 5000,
    });
    expect(result.cashFlow).toBe(
      result.income + result.otherInflows - result.expense - result.otherOutflows,
    );
    expect(result.cashFlow).toBe(-150);
  });

  it("keeps budgetNet exactly equal to allocation - expense + categorizedIncome, independent of income/other inflow/outflow", () => {
    const result = computeDashboardTotals({
      income: 3000,
      otherInflows: 10000,
      expenseRaw: -1200,
      otherOutflowsRaw: -9000,
      categorizedIncome: 0,
      allocation: 2000,
    });
    expect(result.budgetNet).toBe(800);
  });

  it("adds categorizedIncome (a paycheck/reimbursement filed under a category instead of flagged Income) into budgetNet only", () => {
    const result = computeDashboardTotals({
      income: 2500,
      otherInflows: 0,
      expenseRaw: -1200,
      otherOutflowsRaw: 0,
      categorizedIncome: 400,
      allocation: 8260,
    });
    expect(result.budgetNet).toBe(7460);
    expect(result.cashFlow).toBe(1300);
  });

  it("defines inflows = income + otherInflows, outflows = expense + otherOutflows, cashFlow = inflows - outflows", () => {
    const result = computeDashboardTotals({
      income: 7600,
      otherInflows: 340,
      expenseRaw: -2785,
      otherOutflowsRaw: -1120,
      categorizedIncome: 0,
      allocation: 8260,
    });
    expect(result.inflows).toBe(result.income + result.otherInflows);
    expect(result.outflows).toBe(result.expense + result.otherOutflows);
    expect(result.cashFlow).toBe(result.inflows - result.outflows);
    expect(result.cashFlow).toBe(4035);
  });

  it("never counts categorizedIncome twice: it is already inside otherInflows, so inflows and cashFlow ignore it", () => {
    const base = {
      income: 2500,
      otherInflows: 400, // includes the 400 of categorized income below
      expenseRaw: -1200,
      otherOutflowsRaw: 0,
      allocation: 8260,
    };
    const withCategorized = computeDashboardTotals({ ...base, categorizedIncome: 400 });
    const without = computeDashboardTotals({ ...base, categorizedIncome: 0 });
    expect(withCategorized.inflows).toBe(without.inflows);
    expect(withCategorized.cashFlow).toBe(without.cashFlow);
    expect(withCategorized.budgetNet - without.budgetNet).toBe(400);
  });

  it("budgetNet does not move with income — only allocation, expense, categorizedIncome do", () => {
    const withLowIncome = computeDashboardTotals({
      income: 0,
      otherInflows: 0,
      expenseRaw: -1200,
      otherOutflowsRaw: 0,
      categorizedIncome: 0,
      allocation: 8260,
    });
    const withHighIncome = computeDashboardTotals({
      income: 50000,
      otherInflows: 0,
      expenseRaw: -1200,
      otherOutflowsRaw: 0,
      categorizedIncome: 0,
      allocation: 8260,
    });
    expect(withLowIncome.budgetNet).toBe(withHighIncome.budgetNet);
    expect(withLowIncome.budgetNet).toBe(7060);
  });
});
