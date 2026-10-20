import { describe, expect, it } from "vitest";
import {
  applySavedAllocations,
  buildSourcePie,
  categoryStatus,
  dailyFromCumulative,
  dailyPaceStatus,
  trendPair,
  type TrendMonth,
} from "./dashboard-charts";

describe("dailyFromCumulative", () => {
  it("turns the pace chart's running total back into per-day spend that sums to it", () => {
    const cumulative = [1462, 1530, 1530, 1825];
    const daily = dailyFromCumulative(cumulative);
    expect(daily).toEqual([1462, 68, 0, 295]);
    expect(daily.reduce((a, b) => a + b, 0)).toBe(cumulative[cumulative.length - 1]);
  });
});

describe("dailyPaceStatus", () => {
  it("is below at or under pace, slightly above up to 1.5x, well above beyond", () => {
    expect(dailyPaceStatus(266, 266)).toBe("below");
    expect(dailyPaceStatus(295, 266)).toBe("slightly_above");
    expect(dailyPaceStatus(399, 266)).toBe("slightly_above");
    expect(dailyPaceStatus(1462, 266)).toBe("well_above");
  });
});

describe("categoryStatus", () => {
  const monthProgress = 12 / 31;
  it("flags over budget first", () => {
    expect(categoryStatus({ spent: 172, budget: 150, monthProgress })).toBe("over");
  });
  it("treats exactly fully spent as full, not ahead", () => {
    expect(categoryStatus({ spent: 1400, budget: 1400, monthProgress })).toBe("full");
  });
  it("is ahead when the spent share passes the share of the month gone", () => {
    expect(categoryStatus({ spent: 228, budget: 350, monthProgress })).toBe("ahead");
    expect(categoryStatus({ spent: 96, budget: 250, monthProgress })).toBe("below");
  });
  it("treats an unbudgeted, unspent category as below", () => {
    expect(categoryStatus({ spent: 0, budget: 0, monthProgress })).toBe("below");
  });
});

describe("buildSourcePie", () => {
  const sources = [
    { id: "b", name: "Budget", spent: 2785 },
    { id: "f", name: "Float", spent: 640 },
    { id: "c", name: "Car Fund", spent: 310 },
    { id: "t", name: "Travel Fund", spent: 170 },
    { id: "g", name: "Gifts", spent: 50 },
    { id: "s", name: "Savings", spent: 0 },
  ];

  it("totals gross spending and slices it so shares sum to 1", () => {
    const pie = buildSourcePie(sources);
    expect(pie.total).toBe(3955);
    expect(pie.slices.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 10);
  });

  it("gives the top 5 their own tones", () => {
    const pie = buildSourcePie(sources);
    expect(pie.slices.map((s) => s.tone)).toEqual([1, 2, 3, 4, 5]);
  });

  it("groups the rest into Other past maxSlices", () => {
    const pie = buildSourcePie(sources, { maxSlices: 4 });
    expect(pie.slices.map((s) => s.label)).toEqual(["Budget", "Float", "Car Fund", "Travel Fund", "Other"]);
    expect(pie.slices.map((s) => s.tone)).toEqual([1, 2, 3, 4, null]);
    expect(pie.slices[4].amount).toBe(50);
  });

  it("still lists every source in the legend, idle ones last at $0", () => {
    const pie = buildSourcePie(sources);
    expect(pie.legend.map((r) => r.name)).toEqual([
      "Budget",
      "Float",
      "Car Fund",
      "Travel Fund",
      "Gifts",
      "Savings",
    ]);
    expect(pie.legend[5]).toMatchObject({ amount: 0, tone: null });
  });

  it("draws a single source as a full circle", () => {
    const pie = buildSourcePie([{ id: "b", name: "Budget", spent: 10 }]);
    expect(pie.slices[0].path).toContain(" A");
    expect(pie.slices[0].share).toBe(1);
  });

  it("has no slices when nothing was spent", () => {
    const pie = buildSourcePie([{ id: "b", name: "Budget", spent: 0 }]);
    expect(pie.total).toBe(0);
    expect(pie.slices).toEqual([]);
  });
});

describe("trendPair", () => {
  const m: TrendMonth = {
    month: "2026-10-01",
    income: 7600,
    inflows: 7940,
    expense: 2785,
    outflows: 3905,
    allocation: 8260,
  };
  it("picks the two series each mode compares", () => {
    expect(trendPair(m, "income_expenses")).toEqual([7600, 2785]);
    expect(trendPair(m, "inflows_outflows")).toEqual([7940, 3905]);
    expect(trendPair(m, "budget_spending")).toEqual([8260, 2785]);
  });
});

describe("applySavedAllocations", () => {
  it("uses the saved allocation for a month and today's for the rest", () => {
    const out = applySavedAllocations(
      [{ month: "2026-09-01" }, { month: "2026-10-01" }],
      new Map([["2026-09-01", 7900]]),
      8260,
    );
    expect(out.map((m) => m.allocation)).toEqual([7900, 8260]);
  });
});
