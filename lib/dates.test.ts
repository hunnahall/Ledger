import { describe, expect, it } from "vitest";
import { monthsRemaining } from "./dates";

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
