import { describe, expect, it } from "vitest";
import {
  NO_SOURCE_FILTER_VALUE,
  UNCATEGORIZED_FILTER_VALUE,
  resolveCategoryFilter,
  resolveSourceFilter,
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
