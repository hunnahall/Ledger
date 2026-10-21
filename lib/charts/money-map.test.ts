import { describe, expect, it } from "vitest";
import { computeMoneyMap, type MoneyMapSource } from "./money-map";

let n = 0;
const source = (name: string, balance: number, extra: Partial<MoneyMapSource> = {}): MoneyMapSource => ({
  id: name.toLowerCase(),
  name,
  type: "fund",
  isSystem: false,
  createdAt: `2026-01-${String(++n).padStart(2, "0")}`,
  balance,
  ...extra,
});
const budget = (balance: number) => source("Budget", balance, { type: "budget", isSystem: true, createdAt: "2026-02-01" });

describe("computeMoneyMap", () => {
  it("splits the bar by what each Source holds, system Sources first", () => {
    const map = computeMoneyMap({ sources: [source("Car", 400.05), budget(800.05)] });
    expect(map.total).toBe(1200.1);
    expect(map.segments.map((s) => s.id)).toEqual(["budget", "car"]);
    expect(map.segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 10);
  });

  it("lists a negative Source under the bar instead of drawing it, and nets it in the total", () => {
    const map = computeMoneyMap({ sources: [budget(1000), source("Float", -100)] });
    expect(map.total).toBe(900);
    expect(map.segments.map((s) => s.id)).toEqual(["budget"]);
    expect(map.segments[0].share).toBe(1);
    expect(map.negatives).toEqual([{ id: "float", name: "Float", amount: -100 }]);
  });

  it("groups Sources past the twelfth as Other, in stable order", () => {
    const sources = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"].map((name) => source(name, 100));
    const map = computeMoneyMap({ sources: [...sources].reverse() });
    expect(map.segments.map((s) => s.name)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "Other"]);
    expect(map.segments.map((s) => s.tone)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, null]);
    expect(map.segments[12].amount).toBe(200);
  });

  it("leaves out archived Sources", () => {
    const map = computeMoneyMap({ sources: [budget(500), source("Old", 300, { archived: true })] });
    expect(map.total).toBe(500);
  });

  it("has no segments when nothing is held", () => {
    expect(computeMoneyMap({ sources: [budget(0)] }).segments).toEqual([]);
  });
});
