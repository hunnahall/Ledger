import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
  it("formats a plain date column as 'Mon D, YYYY' in UTC", () => {
    expect(formatDate("2026-08-18")).toBe("Aug 18, 2026");
  });

  it("does not shift the day backward due to local timezone", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});

describe("formatDateTime", () => {
  it("formats a timestamptz as 'Mon D, YYYY, H:MM AM/PM' in UTC", () => {
    expect(formatDateTime("2026-08-18T14:05:00Z")).toBe("Aug 18, 2026, 2:05 PM");
  });

  it("does not shift the day backward due to local timezone", () => {
    expect(formatDateTime("2026-01-01T00:30:00Z")).toBe("Jan 1, 2026, 12:30 AM");
  });
});
