import { describe, it, expect } from "vitest";
import {
  cumulativeExpenseByDay,
  isCategorizedIncome,
  isExpense,
  isInflow,
  isOtherInflow,
  isOtherOutflow,
  type Leg,
} from "./legs";

const leg = (over: Partial<Leg>): Leg => ({
  id: "x",
  postedDate: "2026-10-03",
  description: "d",
  amount: -10,
  isIncome: false,
  categoryId: null,
  sourceId: "s",
  sourceType: "budget",
  ...over,
});

describe("expense and other outflows", () => {
  it("counts Budget-sourced outflows as expenses", () => {
    expect(isExpense(leg({}))).toBe(true);
  });
  it("counts a categorized outflow as an expense even off the Budget source", () => {
    expect(isExpense(leg({ sourceType: "float", categoryId: "c" }))).toBe(true);
  });
  it("counts a categorized outflow with no Source as an expense", () => {
    expect(isExpense(leg({ sourceId: null, sourceType: null, categoryId: "c" }))).toBe(true);
  });
  it("counts other sourced outflows as other outflows", () => {
    const l = leg({ sourceType: "fund" });
    expect(isExpense(l)).toBe(false);
    expect(isOtherOutflow(l)).toBe(true);
  });
  it("drops unsourced, uncategorized outflows", () => {
    const l = leg({ sourceId: null, sourceType: null });
    expect(isExpense(l) || isOtherOutflow(l)).toBe(false);
  });
});

describe("inflows", () => {
  it("separates income from other inflows and drops unsourced money", () => {
    expect(isInflow(leg({ amount: 100, isIncome: true, sourceType: "income" }))).toBe(true);
    expect(isOtherInflow(leg({ amount: 20, sourceType: "float" }))).toBe(true);
    expect(isInflow(leg({ amount: 20, sourceId: null, sourceType: null }))).toBe(false);
  });
  it("flags categorized income as a subset of other inflows", () => {
    const l = leg({ amount: 50, categoryId: "c" });
    expect(isCategorizedIncome(l)).toBe(true);
    expect(isOtherInflow(l)).toBe(true);
  });
});

describe("cumulativeExpenseByDay", () => {
  it("accumulates expenses day by day", () => {
    const legs = [
      leg({ postedDate: "2026-10-01", amount: -5 }),
      leg({ postedDate: "2026-10-03", amount: -7 }),
      leg({ postedDate: "2026-10-03", amount: 100, isIncome: true, sourceType: "income" }),
    ];
    expect(cumulativeExpenseByDay(legs, 4)).toEqual([5, 5, 12, 12]);
  });
});
