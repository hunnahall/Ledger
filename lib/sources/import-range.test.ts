import { describe, expect, it } from "vitest";
import { MAX_IMPORT_DAYS, daysBetween } from "./import-range";

describe("daysBetween", () => {
  it("counts both endpoints", () => {
    expect(daysBetween("2026-09-01", "2026-09-01")).toBe(1);
    expect(daysBetween("2026-09-01", "2026-09-02")).toBe(2);
  });

  it("counts across a month boundary", () => {
    expect(daysBetween("2026-08-31", "2026-09-01")).toBe(2);
  });

  it("counts the maximum allowed import window exactly", () => {
    // The edge function rejects anything over MAX_IMPORT_DAYS, so the
    // boundary itself has to be accepted by both sides.
    expect(daysBetween("2026-06-03", "2026-08-31")).toBe(MAX_IMPORT_DAYS);
  });
});
