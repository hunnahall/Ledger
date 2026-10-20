import { describe, expect, it } from "vitest";
import { cumulativeLinePoints, paceChartPeak, valueOnDay } from "./pace";

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

  it("peaks at max(allocation, spent so far, 1) with one month", () => {
    expect(paceChartPeak({ allocation: 3000, lines: [current], daysInMonth })).toBe(3000);
    expect(paceChartPeak({ allocation: 0, lines: [[]], daysInMonth })).toBe(1);
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

  it("fits the highest of several months", () => {
    expect(paceChartPeak({ allocation: 3000, lines: [current, [5000]], daysInMonth })).toBe(5000);
  });
});
