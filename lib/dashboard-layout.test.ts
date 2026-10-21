import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  TILE_IDS,
  clampSpan,
  moveTile,
  normalizeLayout,
  resizeTile,
  setTileVisible,
  showAllTiles,
} from "./dashboard-layout";

describe("normalizeLayout", () => {
  it("uses the default for nothing or junk", () => {
    expect(normalizeLayout(null)).toBe(DEFAULT_LAYOUT);
    expect(normalizeLayout({ tiles: "x" })).toBe(DEFAULT_LAYOUT);
  });

  it("covers every tile once", () => {
    expect(DEFAULT_LAYOUT.tiles.map((t) => t.id).sort()).toEqual([...TILE_IDS].sort());
  });

  it("keeps the saved order, drops unknown and repeated tiles, and adds missing ones at the end", () => {
    const layout = normalizeLayout({
      tiles: [
        { id: "float", span: 3 },
        { id: "nope", span: 3 },
        { id: "float", span: 6 },
        { id: "heatmap", span: 99 },
      ],
      hidden: ["cash-flow", "nope", "cash-flow"],
    });
    expect(layout.tiles.slice(0, 2)).toEqual([
      { id: "float", span: 3 },
      { id: "heatmap", span: 6 },
    ]);
    expect(layout.tiles).toHaveLength(TILE_IDS.length);
    expect(layout.hidden).toEqual(["cash-flow"]);
  });
});

describe("layout edits", () => {
  it("moves a tile to another's place", () => {
    const moved = moveTile(DEFAULT_LAYOUT, "float", "money-map");
    expect(moved.tiles[0].id).toBe("float");
    expect(moved.tiles[1].id).toBe("money-map");
  });

  it("moves a tile to a chosen side of another", () => {
    const ids = (l: ReturnType<typeof moveTile>) => l.tiles.map((t) => t.id);
    const base = ids(DEFAULT_LAYOUT);
    const i = base.indexOf("heatmap");
    expect(ids(moveTile(DEFAULT_LAYOUT, "float", "heatmap", true)).indexOf("float")).toBe(i + 1);
    expect(ids(moveTile(DEFAULT_LAYOUT, "float", "heatmap", false)).indexOf("float")).toBe(i);
  });

  it("keeps a resized tile between a third and full width", () => {
    expect(clampSpan(1)).toBe(2);
    expect(clampSpan(9)).toBe(6);
    expect(resizeTile(DEFAULT_LAYOUT, "float", 5).tiles.find((t) => t.id === "float")?.span).toBe(5);
  });

  it("hides and shows tiles", () => {
    const hidden = setTileVisible(setTileVisible(DEFAULT_LAYOUT, "float", false), "heatmap", false);
    expect(hidden.hidden).toEqual(["float", "heatmap"]);
    expect(setTileVisible(hidden, "float", true).hidden).toEqual(["heatmap"]);
    expect(showAllTiles(hidden).hidden).toEqual([]);
  });
});
