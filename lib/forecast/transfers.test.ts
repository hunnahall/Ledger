import { describe, it, expect } from "vitest";
import { sumTransferAmounts } from "./transfers";

describe("sumTransferAmounts", () => {
  it("is null when there are no transfers", () => {
    expect(sumTransferAmounts([])).toBeNull();
  });
  it("returns a single transfer's amount, including $0", () => {
    expect(sumTransferAmounts([250])).toBe(250);
    expect(sumTransferAmounts([0])).toBe(0);
  });
  it("sums two transfers into the same Source", () => {
    expect(sumTransferAmounts([200, 50.5])).toBe(250.5);
  });
  it("keeps cents exact", () => {
    expect(sumTransferAmounts([0.1, 0.2])).toBe(0.3);
  });
});
