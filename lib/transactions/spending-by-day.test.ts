import { describe, it, expect } from "vitest";
import { spendingByDay, type SpendingRow } from "./spending-by-day";

const row = (over: Partial<SpendingRow>): SpendingRow => ({
  postedDate: "2026-10-01",
  amount: -10,
  isIncome: false,
  categoryId: null,
  sourceId: "budget",
  sourceType: "budget",
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

  it("counts other outflows too, so a day matches outflows", () => {
    const out = spendingByDay([
      row({ amount: -10 }),
      row({ amount: -25, sourceId: "travel", sourceType: "fund" }),
    ]);
    expect(out).toEqual([{ date: "2026-10-01", amount: 35 }]);
  });

  it("ignores inflows and unsourced, uncategorized outflows", () => {
    expect(
      spendingByDay([
        row({ amount: 100, isIncome: true, sourceType: "income" }),
        row({ amount: -10, sourceId: null, sourceType: null }),
      ]),
    ).toEqual([]);
  });

  it("counts an unsourced outflow that carries a category (an expense)", () => {
    const out = spendingByDay([row({ amount: -8, sourceId: null, sourceType: null, categoryId: "food" })]);
    expect(out).toEqual([{ date: "2026-10-01", amount: 8 }]);
  });
});
