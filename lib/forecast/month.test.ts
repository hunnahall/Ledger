import { describe, expect, it } from "vitest";
import { parseMonthYear, formatMonthYear } from "./month";

describe("parseMonthYear", () => {
  it("parses a valid mm/yy string", () => {
    expect(parseMonthYear("08/26")).toBe("2026-08-01");
  });

  it("rejects an out-of-range month", () => {
    expect(parseMonthYear("13/26")).toBeNull();
    expect(parseMonthYear("00/26")).toBeNull();
  });

  it("accepts a single-digit month", () => {
    expect(parseMonthYear("9/26")).toBe("2026-09-01");
    expect(parseMonthYear("1/27")).toBe("2027-01-01");
  });

  it("rejects a malformed string", () => {
    expect(parseMonthYear("2026-08")).toBeNull();
    expect(parseMonthYear("8/2026")).toBeNull();
  });
});

describe("formatMonthYear", () => {
  it("formats a YYYY-MM-01 month string", () => {
    expect(formatMonthYear("2026-08-01")).toBe("08/26");
  });
});
