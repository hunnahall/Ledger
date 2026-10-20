import { describe, expect, it } from "vitest";
import { donutSegmentPath } from "./donut";

describe("donutSegmentPath", () => {
  it("draws a quarter as an outer arc, a side, an inner arc back, and closes", () => {
    const d = donutSegmentPath(0, 0.25, 140)!;
    expect(d.match(/A/g)).toHaveLength(2);
    expect(d).toContain(" L");
    expect(d.endsWith("Z")).toBe(true);
  });

  it("leaves a gap at the start of each segment instead of a stroke", () => {
    const d = donutSegmentPath(0, 0.25, 140)!;
    const [x] = d.slice(1).split(" ")[0].split(",").map(Number);
    expect(x).toBeGreaterThan(70);
  });

  it("draws the whole ring with a hole when one segment covers it", () => {
    const d = donutSegmentPath(0, 1, 140)!;
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/A/g)).toHaveLength(4);
  });

  it("skips a segment thinner than the gap", () => {
    expect(donutSegmentPath(0, 0.0005, 140)).toBeNull();
  });

  it("uses the large-arc flag past half the ring", () => {
    expect(donutSegmentPath(0, 0.75, 140)).toMatch(/A70,70 0 1 1/);
    expect(donutSegmentPath(0, 0.25, 140)).toMatch(/A70,70 0 0 1/);
  });
});
