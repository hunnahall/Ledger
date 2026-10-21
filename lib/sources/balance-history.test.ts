import { describe, expect, it } from "vitest";
import { buildBalanceSeries, logBalanceDelta, parseLogMoney } from "./balance-history";

describe("buildBalanceSeries", () => {
  it("carries a recorded balance forward over days with no change", () => {
    const points = buildBalanceSeries({
      windowStart: "2026-10-01",
      today: "2026-10-04",
      currentBalance: 150,
      recorded: [
        { day: "2026-10-01", balance: 100 },
        { day: "2026-10-03", balance: 150 },
      ],
      events: [],
    });
    expect(points.map((p) => p.balance)).toEqual([100, 100, 150, 150]);
    expect(points.every((p) => !p.estimated)).toBe(true);
  });

  it("estimates days before the first record by undoing known changes", () => {
    const points = buildBalanceSeries({
      windowStart: "2026-10-01",
      today: "2026-10-04",
      currentBalance: 500,
      recorded: [{ day: "2026-10-04", balance: 500 }],
      events: [
        { date: "2026-10-04", delta: 20 },
        { date: "2026-10-02", delta: -100 },
        { date: "2026-10-02", delta: 30 },
      ],
    });
    // End of Oct 3 = 500 - 20. End of Oct 2 = same (nothing on Oct 3). End of Oct 1 = 480 - (-70).
    expect(points.map((p) => [p.date, p.balance, p.estimated])).toEqual([
      ["2026-10-01", 550, true],
      ["2026-10-02", 480, true],
      ["2026-10-03", 480, true],
      ["2026-10-04", 500, false],
    ]);
  });

  it("uses the current balance as today's record when nothing is recorded", () => {
    const points = buildBalanceSeries({
      windowStart: "2026-10-02",
      today: "2026-10-03",
      currentBalance: 75,
      recorded: [],
      events: [],
    });
    expect(points).toEqual([
      { date: "2026-10-02", balance: 75, estimated: true },
      { date: "2026-10-03", balance: 75, estimated: false },
    ]);
  });
});

describe("log entries", () => {
  it("parses the money formats the Log uses", () => {
    expect(parseLogMoney("$1,234.56")).toBe(1234.56);
    expect(parseLogMoney("-719.04")).toBe(-719.04);
    expect(parseLogMoney("active ($3878.00)")).toBeNull();
    expect(parseLogMoney(null)).toBeNull();
  });

  it("reads the change from this Source's balance entries only", () => {
    const edit = { variable: "Hunter — Balance", old_value: "$306.00", new_value: "$356.00" };
    const transfer = { variable: "Hunter balance (Source Transfer: Hunter)", old_value: "290.00", new_value: "640.00" };
    expect(logBalanceDelta(edit, "Hunter")).toBe(50);
    expect(logBalanceDelta(transfer, "Hunter")).toBe(350);
    expect(logBalanceDelta(edit, "Travel")).toBeNull();
    expect(logBalanceDelta({ variable: "Source: Hunter", old_value: null, new_value: "$828.00" }, "Hunter")).toBeNull();
  });
});
