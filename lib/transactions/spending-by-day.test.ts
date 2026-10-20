import { describe, it, expect } from "vitest";
import { spendingByDay, type SpendingRow } from "./spending-by-day";

const row = (over: Partial<SpendingRow>): SpendingRow => ({
  postedDate: "2026-10-01",
  amount: -10,
  isTransfer: false,
  isIncome: false,
  excludeFromBudget: false,
  isSplit: false,
  splits: [],
  ...over,
});

describe("spendingByDay", () => {
  it("sums spending per day and fills the gaps with zero", () => {
    const out = spendingByDay([
      row({ postedDate: "2026-10-01", amount: -5 }),
      row({ postedDate: "2026-10-01", amount: -7 }),
      row({ postedDate: "2026-10-04", amount: -3 }),
    ]);
    expect(out).toEqual([
      { date: "2026-10-01", amount: 12 },
      { date: "2026-10-02", amount: 0 },
      { date: "2026-10-03", amount: 0 },
      { date: "2026-10-04", amount: 3 },
    ]);
  });
  it("ignores inflows, transfers and Excluded rows", () => {
    expect(
      spendingByDay([
        row({ amount: 100, isIncome: true }),
        row({ isTransfer: true }),
        row({ excludeFromBudget: true }),
      ]),
    ).toEqual([]);
  });
  it("counts split transactions by their negative legs", () => {
    const out = spendingByDay([row({ isSplit: true, amount: -20, splits: [{ amount: -30 }, { amount: 10 }] })]);
    expect(out).toEqual([{ date: "2026-10-01", amount: 30 }]);
  });
});
