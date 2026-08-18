import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats a plain date column as 'Mon D, YYYY' in UTC", () => {
    expect(formatDate("2026-08-18")).toBe("Aug 18, 2026");
  });

  it("does not shift the day backward due to local timezone", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});
