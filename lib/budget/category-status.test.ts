import { describe, expect, it } from "vitest";
import { categoryLines, categoryStatus } from "./category-status";

describe("categoryStatus", () => {
  it("is On track under 90%", () => {
    expect(categoryStatus(0, 100)).toBe("on_track");
    expect(categoryStatus(89.99, 100)).toBe("on_track");
  });

  it("is Near limit from 90% up to just under 100%", () => {
    expect(categoryStatus(90, 100)).toBe("near_limit");
    expect(categoryStatus(99.99, 100)).toBe("near_limit");
  });

  it("is Spent at exactly 100%, to the cent", () => {
    expect(categoryStatus(100, 100)).toBe("spent");
    expect(categoryStatus(100.004, 100)).toBe("spent");
  });

  it("is Over past 100%", () => {
    expect(categoryStatus(100.01, 100)).toBe("over");
  });

  it("treats any spending against a $0 budget as Over, and nothing spent as On track", () => {
    expect(categoryStatus(5, 0)).toBe("over");
    expect(categoryStatus(0, 0)).toBe("on_track");
  });

  it("treats a net refund (negative spent) as On track", () => {
    expect(categoryStatus(-20, 100)).toBe("on_track");
  });
});

describe("categoryLines", () => {
  const categories = [
    { id: "a", name: "Food", monthly_amount: 650, spent: 54.37 },
    { id: "b", name: "Fixed", monthly_amount: 50, spent: 680 },
    { id: "c", name: "Transfers", monthly_amount: 0, spent: 5780 },
  ];

  it("gives Transfers the sinking plus source transfer total as its budget", () => {
    const { lines } = categoryLines(categories, 6000);
    const transfers = lines.find((l) => l.id === "c")!;
    expect(transfers.budget).toBe(6000);
    expect(transfers.left).toBe(220);
    expect(transfers.status).toBe("near_limit");
    expect(transfers.isTransfers).toBe(true);
  });

  it("totals the Budget column to the full allocation", () => {
    const { totals } = categoryLines(categories, 6000);
    expect(totals.budget).toBe(6700);
    expect(totals.spent).toBeCloseTo(6514.37);
    expect(totals.left).toBeCloseTo(185.63);
  });

  it("lists the categories that are over", () => {
    const { over } = categoryLines(categories, 6000);
    expect(over.map((l) => l.name)).toEqual(["Fixed"]);
  });
});
