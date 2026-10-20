import { describe, expect, it } from "vitest";
import {
  daysElapsed,
  parseMonthSelection,
  selectableMonths,
  selectionLabel,
  selectionParam,
  selectionProgress,
  toggleMonth,
} from "./dashboard-months";

const months = selectableMonths("2026-10-01");

describe("selectableMonths", () => {
  it("is the current month and the 3 before it, newest first", () => {
    expect(months).toEqual(["2026-10-01", "2026-09-01", "2026-08-01", "2026-07-01"]);
  });

  it("crosses a year boundary", () => {
    expect(selectableMonths("2027-01-01")).toEqual(["2027-01-01", "2026-12-01", "2026-11-01", "2026-10-01"]);
  });
});

describe("parseMonthSelection", () => {
  it("defaults to the current month", () => {
    expect(parseMonthSelection(undefined, months)).toEqual(["2026-10-01"]);
  });

  it("reads a list oldest first, dropping months Ledger no longer keeps", () => {
    expect(parseMonthSelection("2026-10-01,2026-06-01,2026-08-01", months)).toEqual(["2026-08-01", "2026-10-01"]);
  });

  it("reads all", () => {
    expect(parseMonthSelection("all", months)).toEqual(["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
  });

  it("falls back to the current month when nothing valid is given", () => {
    expect(parseMonthSelection("junk,2026-06-01", months)).toEqual(["2026-10-01"]);
  });
});

describe("selectionParam", () => {
  it("drops the param for the current month alone", () => {
    expect(selectionParam(["2026-10-01"], months)).toBeNull();
  });

  it("writes all, or the sorted list", () => {
    expect(selectionParam([...months], months)).toBe("all");
    expect(selectionParam(["2026-09-01", "2026-07-01"], months)).toBe("2026-07-01,2026-09-01");
  });
});

describe("toggleMonth", () => {
  it("adds and removes a month", () => {
    expect(toggleMonth(["2026-10-01"], "2026-09-01", months)).toEqual(["2026-09-01", "2026-10-01"]);
    expect(toggleMonth(["2026-09-01", "2026-10-01"], "2026-10-01", months)).toEqual(["2026-09-01"]);
  });

  it("never removes the last month", () => {
    expect(toggleMonth(["2026-10-01"], "2026-10-01", months)).toEqual(["2026-10-01"]);
  });

  it("narrows all to the month clicked", () => {
    expect(toggleMonth([...months].sort(), "2026-08-01", months)).toEqual(["2026-08-01"]);
  });
});

describe("selectionLabel", () => {
  it("names one month in full", () => {
    expect(selectionLabel(["2026-10-01"], months)).toBe("October 2026");
  });

  it("lists several", () => {
    expect(selectionLabel(["2026-08-01", "2026-09-01", "2026-10-01"], months)).toBe("Aug, Sep and Oct 2026");
  });

  it("names all of them as a range", () => {
    expect(selectionLabel([...months].sort(), months)).toBe("All months, Jul to Oct 2026");
  });
});

describe("daysElapsed and selectionProgress", () => {
  it("counts a past month in full and the current one through today", () => {
    expect(daysElapsed("2026-09-01", "2026-10-20")).toBe(30);
    expect(daysElapsed("2026-10-01", "2026-10-20")).toBe(20);
    expect(daysElapsed("2026-11-01", "2026-10-20")).toBe(0);
  });

  it("is the share of the selected days that have happened", () => {
    expect(selectionProgress(["2026-09-01"], "2026-10-20")).toBe(1);
    expect(selectionProgress(["2026-09-01", "2026-10-01"], "2026-10-20")).toBeCloseTo(50 / 61);
  });
});
