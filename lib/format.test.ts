import { describe, expect, it } from "vitest";
import { formatDate, formatShortDate, logMoney, parseMoney } from "./format";

describe("formatDate", () => {
  it("formats a plain date column as 'Mon D, YYYY' in UTC", () => {
    expect(formatDate("2026-08-18")).toBe("Aug 18, 2026");
  });

  it("does not shift the day backward due to local timezone", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});

describe("formatShortDate", () => {
  it("formats a plain date column as MM/DD", () => {
    expect(formatShortDate("2026-08-18")).toBe("08/18");
  });

  it("keeps leading zeros and drops the year", () => {
    expect(formatShortDate("2026-01-01")).toBe("01/01");
  });
});

describe("parseMoney", () => {
  it("rejects a blank field unless a fallback is given", () => {
    // `Number("")` is 0, which is why a bare Number() let an empty amount
    // through and created $0 transactions.
    expect(parseMoney("")).toEqual({ error: "Enter an amount." });
    expect(parseMoney(null)).toEqual({ error: "Enter an amount." });
    expect(parseMoney("", { fallback: 0 })).toEqual({ amount: 0 });
  });

  it("rejects non-numeric input rather than passing NaN to a numeric column", () => {
    expect(parseMoney("abc")).toEqual({ error: "Enter a valid amount." });
    expect(parseMoney("abc", { fallback: 0 })).toEqual({ error: "Enter a valid amount." });
    expect(parseMoney("Infinity")).toEqual({ error: "Enter a valid amount." });
  });

  it("enforces a positive amount when asked", () => {
    expect(parseMoney("0", { positive: true })).toEqual({
      error: "Enter an amount greater than zero.",
    });
    expect(parseMoney("-5", { positive: true })).toEqual({
      error: "Enter an amount greater than zero.",
    });
    expect(parseMoney("-5")).toEqual({ amount: -5 });
  });

  it("rounds to cents, matching the numeric(12,2) columns", () => {
    expect(parseMoney("42.005")).toEqual({ amount: 42.01 });
    expect(parseMoney(" 42.50 ")).toEqual({ amount: 42.5 });
  });
});

describe("logMoney", () => {
  it("formats an activity-log amount, optionally with a suffix", () => {
    expect(logMoney(1234.5)).toBe("$1,234.50");
    expect(logMoney(20, "/mo")).toBe("$20.00/mo");
  });
});
