import { describe, expect, it } from "vitest";
import { bullet, BULLET_DOMAIN } from "./bullet";

describe("bullet", () => {
  it("puts every budget tick in the same place on the fixed 0-130% scale", () => {
    const a = bullet({ spent: 10, budget: 100, monthProgress: 0.5 })!;
    const b = bullet({ spent: 900, budget: 5000, monthProgress: 0.5 })!;
    expect(a.budgetMark).toBe(b.budgetMark);
    expect(a.budgetMark).toBeCloseTo(1 / BULLET_DOMAIN, 10);
  });

  it("colors by the category status: accent under 90%, warning 90-100%, danger past 100%", () => {
    expect(bullet({ spent: 89, budget: 100, monthProgress: 0.1 })!.tone).toBe("accent");
    expect(bullet({ spent: 90, budget: 100, monthProgress: 0.1 })!.tone).toBe("warning");
    expect(bullet({ spent: 100, budget: 100, monthProgress: 0.1 })!.tone).toBe("warning");
    expect(bullet({ spent: 100.01, budget: 100, monthProgress: 0.1 })!.tone).toBe("danger");
  });

  it("never lets pace change the color", () => {
    expect(bullet({ spent: 80, budget: 100, monthProgress: 0.1 })!.tone).toBe("accent");
    expect(bullet({ spent: 95, budget: 100, monthProgress: 1 })!.tone).toBe("warning");
  });

  it("caps the fill at the end of the scale", () => {
    expect(bullet({ spent: 500, budget: 100, monthProgress: null })!.fill).toBe(1);
    expect(bullet({ spent: 65, budget: 100, monthProgress: null })!.fill).toBeCloseTo(0.5, 10);
  });

  it("places the pace tick at dayOfMonth / daysInMonth, and hides it outside the current month", () => {
    expect(bullet({ spent: 0, budget: 100, monthProgress: 13 / 26 })!.paceMark).toBeCloseTo(0.5 / BULLET_DOMAIN, 10);
    expect(bullet({ spent: 0, budget: 100, monthProgress: null })!.paceMark).toBeNull();
  });

  it("draws no bar for a $0 budget", () => {
    expect(bullet({ spent: 20, budget: 0, monthProgress: 0.5 })).toBeNull();
  });
});
