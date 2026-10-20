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
const cash = (...balances: number[]) => balances.map((balance) => ({ balance, includeInCash: true }));

describe("computeMoneyMap", () => {
  it("reads exact when every dollar is in a Source", () => {
    const map = computeMoneyMap({ accounts: cash(1000, 200.1), sources: [source("Car", 400.05), budget(800.05)] });
    expect(map).toMatchObject({ cash: 1200.1, assigned: 1200.1, unassigned: 0, status: "exact", cashMark: null });
    expect(map.segments.map((s) => s.id)).toEqual(["budget", "car"]);
    expect(map.segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 10);
    expect(map.unassignedShare).toBe(0);
  });

  it("shows cash no Source holds as unassigned", () => {
    const map = computeMoneyMap({ accounts: cash(1000), sources: [budget(600), source("Car", 150)] });
    expect(map).toMatchObject({ unassigned: 250, status: "under", cashMark: null });
    expect(map.unassignedShare).toBeCloseTo(0.25, 10);
    expect(map.segments.reduce((sum, s) => sum + s.share, 0) + map.unassignedShare).toBeCloseTo(1, 10);
  });

  it("spans the Sources and marks where cash ends when they hold more than the accounts", () => {
    const map = computeMoneyMap({ accounts: cash(800), sources: [budget(600), source("Car", 400)] });
    expect(map).toMatchObject({ assigned: 1000, unassigned: -200, status: "over" });
    expect(map.cashMark).toBeCloseTo(0.8, 10);
    expect(map.unassignedShare).toBe(0);
    expect(map.segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 10);
  });

  it("lists a negative Source under the bar instead of drawing it, and still counts it", () => {
    const map = computeMoneyMap({ accounts: cash(900), sources: [budget(1000), source("Float", -100)] });
    expect(map).toMatchObject({ assigned: 900, unassigned: 0, status: "exact" });
    expect(map.segments.map((s) => s.id)).toEqual(["budget"]);
    expect(map.negatives).toEqual([{ id: "float", name: "Float", amount: -100 }]);
  });

  it("groups Sources past the sixth as Other, in stable order", () => {
    const sources = ["A", "B", "C", "D", "E", "F", "G", "H"].map((name) => source(name, 100));
    const map = computeMoneyMap({ accounts: cash(800), sources: [...sources].reverse() });
    expect(map.segments.map((s) => s.name)).toEqual(["A", "B", "C", "D", "E", "F", "Other"]);
    expect(map.segments.map((s) => s.tone)).toEqual([1, 2, 3, 4, 5, 6, null]);
    expect(map.segments[6].amount).toBe(200);
  });

  it("leaves out archived Sources and accounts not counted as cash", () => {
    const map = computeMoneyMap({
      accounts: [...cash(500), { balance: 9000, includeInCash: false }],
      sources: [budget(500), source("Old", 300, { archived: true })],
    });
    expect(map).toMatchObject({ cash: 500, assigned: 500, status: "exact" });
  });

  it("is empty with no accounts", () => {
    expect(computeMoneyMap({ accounts: [], sources: [budget(0)] }).empty).toBe(true);
  });
});
