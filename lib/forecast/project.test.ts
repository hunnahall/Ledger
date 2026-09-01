import { describe, expect, it } from "vitest";
import { projectForecast } from "./project";

describe("projectForecast", () => {
  it("applies just the monthly transfer with no entries", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 1000,
      entries: [],
      startMonthISO: "2026-08-01",
      months: 3,
    });
    expect(points.map((p) => p.value)).toEqual([1000, 2000, 3000]);
  });

  it("subtracts an expense starting the month it lands, cumulatively", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 1000,
      entries: [{ month: "2026-08-01", isExpense: true, amount: 200 }],
      startMonthISO: "2026-08-01",
      months: 2,
    });
    expect(points.map((p) => p.value)).toEqual([800, 1800]);
  });

  it("layers a second expense in a later month on top of the first", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 1000,
      entries: [
        { month: "2026-08-01", isExpense: true, amount: 200 },
        { month: "2026-09-01", isExpense: true, amount: 400 },
      ],
      startMonthISO: "2026-08-01",
      months: 3,
    });
    expect(points.map((p) => p.value)).toEqual([800, 1400, 2400]);
  });

  it("adds a deposit instead of subtracting", () => {
    const points = projectForecast({
      startingBalance: 500,
      monthlyTransfer: 0,
      entries: [{ month: "2026-08-01", isExpense: false, amount: 300 }],
      startMonthISO: "2026-08-01",
      months: 1,
    });
    expect(points.map((p) => p.value)).toEqual([800]);
  });

  it("can run negative when expenses outpace the transfer", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 100,
      entries: [{ month: "2026-08-01", isExpense: true, amount: 500 }],
      startMonthISO: "2026-08-01",
      months: 1,
    });
    expect(points.map((p) => p.value)).toEqual([-400]);
  });
});
