import { describe, expect, it } from "vitest";
import { arcDash, ringArcs } from "./donut";

describe("ringArcs", () => {
  it("lays slices end to end around the ring", () => {
    const arcs = ringArcs([0.5, 0.25, 0.25]);
    expect(arcs.map((a) => a.offset)).toEqual([0, 50, 75]);
  });

  it("runs each slice a hair under the next so no seam shows, but not the last", () => {
    const arcs = ringArcs([0.5, 0.5]);
    expect(arcs[0].length).toBeGreaterThan(50);
    expect(arcs[1].length).toBe(50);
  });

  it("never runs past the end of the ring", () => {
    const arcs = ringArcs([0.9999, 0.0001]);
    expect(arcs[0].offset + arcs[0].length).toBeLessThanOrEqual(100);
  });

  it("covers the whole ring with one slice", () => {
    expect(ringArcs([1])).toEqual([{ offset: 0, length: 100 }]);
  });
});

describe("arcDash", () => {
  it("draws the arc's length, then a gap for the rest, starting at its offset", () => {
    expect(arcDash({ offset: 25, length: 50 })).toEqual({ strokeDasharray: "50 50", strokeDashoffset: -25 });
  });
});
