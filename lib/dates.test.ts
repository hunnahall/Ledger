import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentDayOfMonth,
  currentMonthISO,
  daysInMonthISO,
  monthLabel,
  monthsRemaining,
  nextMonthISO,
  previousMonthISO,
  todayISO,
} from "./dates";

describe("monthsRemaining", () => {
  it("counts whole months between two month starts", () => {
    expect(monthsRemaining("2027-02-01", "2026-08-01")).toBe(6);
  });

  it("floors at 1 for a target date this month", () => {
    expect(monthsRemaining("2026-08-15", "2026-08-01")).toBe(1);
  });

  it("floors at 1 for a target date in the past", () => {
    expect(monthsRemaining("2026-01-01", "2026-08-01")).toBe(1);
  });

  it("counts across a year boundary", () => {
    expect(monthsRemaining("2027-01-01", "2026-12-01")).toBe(1);
  });
});

describe("timezone-aware month boundaries", () => {
  // The bug this exists to prevent: "what month is it" used to be computed
  // in UTC, so for anyone west of UTC the last hours of each local month
  // already counted as the next one — firing the monthly budget reset,
  // income sweep and sinking contribution early.
  const lastEveningOfAugustInLA = new Date("2026-09-01T02:00:00Z"); // 7pm Aug 31 PDT

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(lastEveningOfAugustInLA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("still reports August for a Los Angeles account", () => {
    expect(currentMonthISO("America/Los_Angeles")).toBe("2026-08-01");
    expect(todayISO("America/Los_Angeles")).toBe("2026-08-31");
    expect(currentDayOfMonth("America/Los_Angeles")).toBe(31);
  });

  it("reports September in UTC at the same instant", () => {
    expect(currentMonthISO("UTC")).toBe("2026-09-01");
    expect(todayISO("UTC")).toBe("2026-09-01");
  });

  it("reports September for a zone east of UTC", () => {
    expect(currentMonthISO("Asia/Tokyo")).toBe("2026-09-01");
  });

  it("falls back to UTC rather than throwing on an unresolvable zone", () => {
    expect(currentMonthISO("Not/AZone")).toBe("2026-09-01");
  });
});

describe("monthLabel", () => {
  it("names the month regardless of the viewer's own zone", () => {
    expect(monthLabel("2026-09-01")).toBe("September 2026");
    expect(monthLabel("2026-01-01")).toBe("January 2026");
  });
});

describe("month arithmetic", () => {
  it("walks forward and backward across year boundaries", () => {
    expect(nextMonthISO("2026-12-01")).toBe("2027-01-01");
    expect(previousMonthISO("2026-01-01")).toBe("2025-12-01");
  });

  it("counts days in a month, including a leap February", () => {
    expect(daysInMonthISO("2026-02-01")).toBe(28);
    expect(daysInMonthISO("2028-02-01")).toBe(29);
    expect(daysInMonthISO("2026-09-01")).toBe(30);
  });
});
