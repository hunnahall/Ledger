import { describe, expect, it } from "vitest";
import {
  NO_SOURCE_FILTER_VALUE,
  UNCATEGORIZED_FILTER_VALUE,
  resolveCategoryFilter,
  resolveSourceFilter,
  parseSearchAmount,
  searchOrFilter,
  summarizeTransactions,
} from "./filters";

// Both sentinels have to be translated before they reach a query — passing
// one through as a literal id sends a non-UUID into a uuid column, which is
// exactly the bug the CSV export had when it applied resolveCategoryFilter
// but not resolveSourceFilter.
describe("resolveCategoryFilter", () => {
  it("turns the sentinel into the uncategorizedOnly flag", () => {
    expect(resolveCategoryFilter(UNCATEGORIZED_FILTER_VALUE)).toEqual({ uncategorizedOnly: true });
  });

  it("passes a real category id through", () => {
    expect(resolveCategoryFilter("abc")).toEqual({ categoryId: "abc" });
  });

  it("passes undefined through as no filter", () => {
    expect(resolveCategoryFilter(undefined)).toEqual({ categoryId: undefined });
  });
});

describe("resolveSourceFilter", () => {
  it("turns the sentinel into the sourceIsNull flag", () => {
    expect(resolveSourceFilter(NO_SOURCE_FILTER_VALUE)).toEqual({ sourceIsNull: true });
  });

  it("passes a real source id through", () => {
    expect(resolveSourceFilter("abc")).toEqual({ sourceId: "abc" });
  });

  it("never returns the sentinel as an id", () => {
    expect(resolveSourceFilter(NO_SOURCE_FILTER_VALUE)).not.toHaveProperty("sourceId");
  });
});

describe("summarizeTransactions", () => {
  const row = (amount: number, over: Partial<{ sourceId: string | null; excludeFromBudget: boolean; isIncome: boolean }> = {}) => ({
    amount,
    sourceId: "budget",
    excludeFromBudget: false,
    isIncome: false,
    ...over,
  });

  it("counts rows and nets every amount", () => {
    expect(summarizeTransactions([row(-20.1), row(-5.2), row(100)])).toEqual({
      count: 3,
      withoutSource: 0,
      net: 74.7,
    });
  });

  it("counts only rows that need a Source, like the No source filter", () => {
    const summary = summarizeTransactions([
      row(-10, { sourceId: null }),
      row(-10, { sourceId: null, excludeFromBudget: true }),
      row(50, { sourceId: null, isIncome: true }),
    ]);
    expect(summary.withoutSource).toBe(1);
  });

  it("is empty with no rows", () => {
    expect(summarizeTransactions([])).toEqual({ count: 0, withoutSource: 0, net: 0 });
  });
});

describe("parseSearchAmount", () => {
  it("reads plain, dollar, comma and signed amounts as a magnitude", () => {
    expect(parseSearchAmount("12.50")).toBe(12.5);
    expect(parseSearchAmount("$1,204.18")).toBe(1204.18);
    expect(parseSearchAmount("-40")).toBe(40);
    expect(parseSearchAmount("\u221240")).toBe(40);
  });

  it("is null for anything that isn't an amount", () => {
    expect(parseSearchAmount("coffee")).toBeNull();
    expect(parseSearchAmount("7-eleven")).toBeNull();
    expect(parseSearchAmount("1.234")).toBeNull();
    expect(parseSearchAmount("")).toBeNull();
  });
});

describe("searchOrFilter", () => {
  it("matches description, notes and merchant for a word", () => {
    expect(searchOrFilter("coffee")).toBe(
      'description.ilike."%coffee%",notes.ilike."%coffee%",merchant_normalized.ilike."%coffee%"',
    );
  });

  it("adds both signs of the amount when the term is a number", () => {
    expect(searchOrFilter("12.50")).toContain("amount.eq.12.5,amount.eq.-12.5");
  });

  it("adds matching Category and Source ids", () => {
    const filter = searchOrFilter("food", { categoryIds: ["c1"], sourceIds: ["s1", "s2"] });
    expect(filter).toContain("category_id.in.(c1)");
    expect(filter).toContain("source_id.in.(s1,s2)");
  });

  it("escapes LIKE wildcards and keeps commas and quotes inside the quoted value", () => {
    expect(searchOrFilter('50% off, "deal"')).toContain('description.ilike."%50\\\\% off, \\"deal\\"%"');
  });
});
