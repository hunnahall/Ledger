import { describe, expect, it } from "vitest";
import { buildHeatmap, heatLevel, monthTotals, quantile, weekday } from "./heatmap";
import { dailySpending } from "./daily-spending";
import { isOutflow, type Leg } from "@/lib/transactions/legs";

describe("buildHeatmap", () => {
  // 2026-10-01 is a Thursday.
  const map = buildHeatmap(
    [
      { date: "2026-10-01", spent: 10 },
      { date: "2026-10-02", spent: 20 },
      { date: "2026-10-05", spent: 30 },
      { date: "2026-10-06", spent: 2000 },
    ],
    { from: "2026-10-01", to: "2026-10-10" },
  );

  it("starts weeks on Sunday and leaves days outside the range empty", () => {
    expect(weekday("2026-10-01")).toBe(4);
    expect(map.weeks).toHaveLength(2);
    expect(map.weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(map.weeks[0][4]?.date).toBe("2026-10-01");
    expect(map.weeks[1][6]?.date).toBe("2026-10-10");
    expect(map.cells).toHaveLength(10);
  });

  it("shades by quartile of nonzero days, so one big day doesn't flatten the rest", () => {
    const level = (date: string) => map.cells.find((c) => c.date === date)!.level;
    expect(level("2026-10-03")).toBe(0);
    expect(level("2026-10-01")).toBe(1);
    expect(level("2026-10-02")).toBe(2);
    expect(level("2026-10-05")).toBe(3);
    expect(level("2026-10-06")).toBe(4);
  });
});
describe("buildHeatmap with a month left out", () => {
  it("blanks the days it doesn't include and keeps them out of the scale", () => {
    const days = [
      { date: "2026-08-31", spent: 10 },
      { date: "2026-09-01", spent: 9999 },
      { date: "2026-10-01", spent: 30 },
    ];
    const map = buildHeatmap(days, {
      from: "2026-08-31",
      to: "2026-10-01",
      include: (date) => !date.startsWith("2026-09"),
    });
    expect(map.cells.map((c) => c.date)).toEqual(["2026-08-31", "2026-10-01"]);
    expect(map.thresholds[2]).toBeLessThanOrEqual(30);
  });
});


describe("quantile and heatLevel", () => {
  it("interpolates and bins", () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(quantile([], 0.5)).toBe(0);
    expect(heatLevel(0, [1, 2, 3])).toBe(0);
    expect(heatLevel(3.01, [1, 2, 3])).toBe(4);
  });
});

describe("dailySpending", () => {
  const leg = (postedDate: string, amount: number, extra: Partial<Leg> = {}): Leg => ({
    id: `${postedDate}${amount}${Math.random()}`,
    postedDate,
    description: "",
    amount,
    isIncome: false,
    categoryId: null,
    sourceId: "s",
    sourceType: "fund",
    ...extra,
  });
  const legs = [
    leg("2026-09-01", -10.1),
    leg("2026-09-01", -0.2),
    leg("2026-09-02", 400, { isIncome: true }),
    leg("2026-09-02", -33.33, { sourceId: null, sourceType: null, categoryId: "c" }),
    leg("2026-09-03", -99, { sourceId: null, sourceType: null }),
    leg("2026-09-30", -1234.56, { sourceType: "budget" }),
    leg("2026-10-01", -5),
  ];

  it("counts outflows only and drops rows with neither a Source nor a Category", () => {
    const days = dailySpending(legs);
    expect(days.find((d) => d.date === "2026-09-01")?.spent).toBe(10.3);
    expect(days.find((d) => d.date === "2026-09-03")?.spent).toBe(0);
  });

  it("sums each month to its Outflows to the cent", () => {
    const outflows = legs
      .filter((l) => isOutflow(l) && l.postedDate.startsWith("2026-09"))
      .reduce((sum, l) => sum - Math.round(l.amount * 100), 0);
    expect(Math.round(monthTotals(dailySpending(legs)).get("2026-09-01")! * 100)).toBe(outflows);
  });
});
