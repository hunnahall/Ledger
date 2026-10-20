import { describe, expect, it } from "vitest";
import { cumulativeLinePoints, earlierMonthLines, earlierMonths, paceChartPeak, valueOnDay } from "./pace";
import type { Leg } from "@/lib/transactions/legs";

const leg = (postedDate: string, amount: number, extra: Partial<Leg> = {}): Leg => ({
  id: postedDate + amount,
  postedDate,
  description: "",
  amount,
  isIncome: false,
  categoryId: null,
  sourceId: "b",
  sourceType: "budget",
  ...extra,
});

describe("earlierMonths", () => {
  it("walks back three months across a year boundary", () => {
    expect(earlierMonths("2026-02-01")).toEqual(["2026-01-01", "2025-12-01", "2025-11-01"]);
  });
});

describe("earlierMonthLines", () => {
  it("builds each month's cumulative expense and skips a month with no data", () => {
    const legs = [
      leg("2026-09-01", -100),
      leg("2026-09-03", -50),
      leg("2026-09-03", 500, { isIncome: true }),
      leg("2026-07-30", -10),
    ];
    const lines = earlierMonthLines(legs, ["2026-09-01", "2026-08-01", "2026-07-01"]);
    expect(lines.map((l) => l.month)).toEqual(["2026-09-01", "2026-07-01"]);
    expect(lines[0].byDay.slice(0, 4)).toEqual([100, 100, 150, 150]);
    expect(lines[0].byDay).toHaveLength(30);
    expect(lines[1].byDay[30]).toBe(10);
  });
});

describe("valueOnDay", () => {
  it("holds a short month's last value", () => {
    expect(valueOnDay([1, 2, 3], 2)).toBe(2);
    expect(valueOnDay([1, 2, 3], 31)).toBe(3);
    expect(valueOnDay([], 5)).toBe(0);
  });
});

describe("pace chart current line (regression)", () => {
  const current = [120, 120, 340.5, 360];
  const daysInMonth = 31;

  it("peaks at the old max(allocation, spent so far, 1) when there are no earlier months", () => {
    expect(paceChartPeak({ allocation: 3000, current, earlier: [], daysInMonth })).toBe(3000);
    expect(paceChartPeak({ allocation: 0, current: [], earlier: [], daysInMonth })).toBe(1);
  });

  it("draws the same points the chart drew before the overlay", () => {
    const W = 560;
    const H = 160;
    const maxY = 4000;
    // The previous inline formula from components/dashboard/pace-card.tsx.
    const x = (day: number) => (day / daysInMonth) * W;
    const y = (amount: number) => H - (amount / maxY) * H;
    const r = (n: number) => Math.round(n * 10) / 10;
    const old = [[0, H], ...current.map((v, i) => [x(i + 1), y(v)])].map(([a, b]) => `${r(a)},${r(b)}`).join(" ");
    expect(cumulativeLinePoints(current, { daysInMonth, maxY, width: W, height: H })).toBe(old);
  });

  it("only raises the scale for earlier months, never changes the current values", () => {
    const earlier = [{ month: "2026-09-01", byDay: [5000] }];
    expect(paceChartPeak({ allocation: 3000, current, earlier, daysInMonth })).toBe(5000);
  });
});
