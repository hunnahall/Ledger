import { describe, expect, it } from "vitest";
import { groupSourcesByType } from "./group-sources";

describe("groupSourcesByType", () => {
  it("buckets each of the 3 types correctly", () => {
    const sources = [
      { id: "1", type: "budget" },
      { id: "2", type: "reimbursement" },
      { id: "3", type: "fund" },
    ];
    const groups = groupSourcesByType(sources);
    expect(groups.budget.map((s) => s.id)).toEqual(["1"]);
    expect(groups.reimbursement.map((s) => s.id)).toEqual(["2"]);
    expect(groups.fund.map((s) => s.id)).toEqual(["3"]);
  });

  it("returns empty groups for an empty list", () => {
    const groups = groupSourcesByType([]);
    expect(groups).toEqual({ budget: [], reimbursement: [], fund: [] });
  });

  it("never lets a fund-type source land in reimbursement", () => {
    const groups = groupSourcesByType([{ id: "1", type: "fund" }]);
    expect(groups.reimbursement).toEqual([]);
    expect(groups.fund).toHaveLength(1);
  });
});
