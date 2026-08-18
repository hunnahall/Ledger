import { describe, expect, it } from "vitest";
import { groupSourcesByType } from "./group-sources";

describe("groupSourcesByType", () => {
  it("buckets each of the 4 types correctly", () => {
    const sources = [
      { id: "1", type: "budget" },
      { id: "2", type: "past_payment" },
      { id: "3", type: "future_repayment" },
      { id: "4", type: "fund" },
    ];
    const groups = groupSourcesByType(sources);
    expect(groups.budget.map((s) => s.id)).toEqual(["1"]);
    expect(groups.pastPayment.map((s) => s.id)).toEqual(["2"]);
    expect(groups.futureRepayment.map((s) => s.id)).toEqual(["3"]);
    expect(groups.fund.map((s) => s.id)).toEqual(["4"]);
  });

  it("returns empty groups for an empty list", () => {
    const groups = groupSourcesByType([]);
    expect(groups).toEqual({ budget: [], pastPayment: [], futureRepayment: [], fund: [] });
  });

  it("never lets a fund-type source land in pastPayment or futureRepayment", () => {
    const groups = groupSourcesByType([{ id: "1", type: "fund" }]);
    expect(groups.pastPayment).toEqual([]);
    expect(groups.futureRepayment).toEqual([]);
    expect(groups.fund).toHaveLength(1);
  });
});
