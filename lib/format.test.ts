import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatRelative, formatShortDate, logMoney, parseMoney } from "./format";

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

describe("formatMoney", () => {
  it("uses a true minus sign for negatives", () => {
    expect(formatMoney(-1204.18)).toBe("\u2212$1,204.18");
  });

  it("drops the $ for table cells", () => {
    expect(formatMoney(-1204.18, 2, { symbol: false })).toBe("\u22121,204.18");
  });

  it("rounds to the requested decimals", () => {
    expect(formatMoney(1234.5, 0)).toBe("$1,235");
  });
});

describe("formatRelative", () => {
  const tz = "America/New_York";
  // 3:00 PM on Oct 19, 2026 in New York.
  const now = new Date("2026-10-19T19:00:00Z");

  it("says Just now under a minute", () => {
    expect(formatRelative("2026-10-19T18:59:30Z", now, tz)).toBe("Just now");
  });

  it("counts minutes, then hours, on the same day", () => {
    expect(formatRelative("2026-10-19T18:55:00Z", now, tz)).toBe("5m");
    expect(formatRelative("2026-10-19T17:00:00Z", now, tz)).toBe("2h");
  });

  it("says Yesterday for the previous calendar day, even under 24 hours", () => {
    // 11:00 PM on Oct 18 in New York.
    expect(formatRelative("2026-10-19T03:00:00Z", now, tz)).toBe("Yesterday");
  });

  it("shows a short date after that, adding the year when it differs", () => {
    expect(formatRelative("2026-10-12T16:00:00Z", now, tz)).toBe("Oct 12");
    expect(formatRelative("2025-12-30T16:00:00Z", now, tz)).toBe("Dec 30, 2025");
  });

  it("keeps counting minutes across midnight", () => {
    const justAfterMidnight = new Date("2026-10-19T04:02:00Z");
    expect(formatRelative("2026-10-19T03:58:00Z", justAfterMidnight, tz)).toBe("4m");
  });

  it("treats a future time as Just now", () => {
    expect(formatRelative("2026-10-19T19:05:00Z", now, tz)).toBe("Just now");
  });
});
