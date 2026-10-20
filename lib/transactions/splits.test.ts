import { describe, expect, it } from "vitest";
import { buildSplitGroups, validateSplitRows, type SplitRowInput } from "./splits";

const row = (over: Partial<SplitRowInput>): SplitRowInput => ({
  amount: 0,
  sourceId: "budget",
  categoryId: null,
  exclude: false,
  notes: "",
  ...over,
});

describe("validateSplitRows", () => {
  it("accepts pieces that add up to the transaction, ignoring blank rows", () => {
    const result = validateSplitRows(-100, [row({ amount: -60 }), row({ amount: -40 }), row({})], "budget");
    expect("rows" in result && result.rows).toHaveLength(2);
  });

  it("compares to the cent, so floating-point sums don't fail", () => {
    const result = validateSplitRows(-0.3, [row({ amount: -0.1 }), row({ amount: -0.2 })], "budget");
    expect("rows" in result).toBe(true);
  });

  it("says how much is left when the pieces don't add up", () => {
    expect(validateSplitRows(-100, [row({ amount: -60 }), row({ amount: -30 })], "budget")).toEqual({
      error: "The pieces must add up to the transaction. -10.00 is left to assign.",
    });
  });

  it("needs at least 2 pieces, and no rows at all means remove the split", () => {
    expect(validateSplitRows(-100, [row({ amount: -100 })], "budget")).toEqual({
      error: "A split needs at least 2 pieces.",
    });
    expect(validateSplitRows(-100, [row({}), row({})], "budget")).toEqual({ rows: [] });
  });

  it("allows at most 4 pieces", () => {
    const five = Array.from({ length: 5 }, () => row({ amount: -20 }));
    expect(validateSplitRows(-100, five, "budget")).toEqual({ error: "A split can have at most 4 pieces." });
  });

  it("keeps a category only on a Budget piece, and clears source and category on an Excluded one", () => {
    const result = validateSplitRows(
      -100,
      [
        row({ amount: -50, categoryId: "food" }),
        row({ amount: -30, sourceId: "travel", categoryId: "food" }),
        row({ amount: -20, exclude: true, categoryId: "food" }),
      ],
      "budget",
    );
    if (!("rows" in result)) throw new Error("expected rows");
    expect(result.rows.map((r) => [r.sourceId, r.categoryId])).toEqual([
      ["budget", "food"],
      ["travel", null],
      [null, null],
    ]);
  });
});

describe("buildSplitGroups", () => {
  it("groups pieces under their original in arrival order", () => {
    const piece = (id: string, parentId: string) => ({
      id,
      parentId,
      parentAmount: -10,
      amount: -5,
      sourceId: null,
      categoryId: null,
      excluded: false,
      notes: null,
    });
    const groups = buildSplitGroups([piece("a", "p1"), piece("b", "p2"), piece("c", "p1")]);
    expect(groups.get("p1")!.pieces.map((p) => p.id)).toEqual(["a", "c"]);
    expect(groups.get("p2")!.pieces).toHaveLength(1);
  });
});
