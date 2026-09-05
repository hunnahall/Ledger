import { describe, expect, it } from "vitest";
import { projectForecast, projectEntryBalances } from "./project";

describe("projectForecast", () => {
  it("starts at the current balance and applies the transfer from the second month on", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 1000,
      entries: [],
      startMonthISO: "2026-08-01",
      months: 3,
    });
    expect(points.map((p) => p.value)).toEqual([0, 1000, 2000]);
  });

  it("subtracts a current-month expense from the starting balance, then resumes the transfer", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 1000,
      entries: [{ month: "2026-08-01", isExpense: true, amount: 200 }],
      startMonthISO: "2026-08-01",
      months: 2,
    });
    expect(points.map((p) => p.value)).toEqual([-200, 800]);
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
    expect(points.map((p) => p.value)).toEqual([-200, 400, 1400]);
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

  it("can run negative from a current-month expense alone", () => {
    const points = projectForecast({
      startingBalance: 0,
      monthlyTransfer: 100,
      entries: [{ month: "2026-08-01", isExpense: true, amount: 500 }],
      startMonthISO: "2026-08-01",
      months: 1,
    });
    expect(points.map((p) => p.value)).toEqual([-500]);
  });
});

describe("projectEntryBalances", () => {
  it("applies entries within the same month in order, on top of the starting balance", () => {
    const balances = projectEntryBalances({
      startingBalance: 1000,
      monthlyTransfer: 500,
      entries: [
        { id: "a", month: "2026-08-01", isExpense: true, amount: 200 },
        { id: "b", month: "2026-08-01", isExpense: false, amount: 50 },
      ],
      startMonthISO: "2026-08-01",
    });
    expect(balances.get("a")).toBe(800);
    expect(balances.get("b")).toBe(850);
  });

  it("applies the monthly transfer once per month crossed between entries", () => {
    const balances = projectEntryBalances({
      startingBalance: 0,
      monthlyTransfer: 1000,
      entries: [
        { id: "a", month: "2026-08-01", isExpense: true, amount: 200 },
        { id: "b", month: "2026-10-01", isExpense: true, amount: 400 },
      ],
      startMonthISO: "2026-08-01",
    });
    // month 1 (current): 0 - 200 = -200
    // month 2: -200 + 1000 = 800 (no entry)
    // month 3: 800 + 1000 - 400 = 1400
    expect(balances.get("a")).toBe(-200);
    expect(balances.get("b")).toBe(1400);
  });

  it("ignores an entry dated before the forecast's start month", () => {
    const balances = projectEntryBalances({
      startingBalance: 100,
      monthlyTransfer: 0,
      entries: [{ id: "a", month: "2026-07-01", isExpense: true, amount: 50 }],
      startMonthISO: "2026-08-01",
    });
    expect(balances.has("a")).toBe(false);
  });
});
