import { describe, expect, it } from "vitest";
import { resolveDefaultBudgetId } from "./resolve-default";

describe("resolveDefaultBudgetId", () => {
  it("picks the current budget when one is flagged", () => {
    const budgets = [
      { id: "a", is_current: false },
      { id: "b", is_current: true },
    ];
    expect(resolveDefaultBudgetId(budgets)).toBe("b");
  });

  it("falls back to the first budget when none is current", () => {
    const budgets = [
      { id: "a", is_current: false },
      { id: "b", is_current: false },
    ];
    expect(resolveDefaultBudgetId(budgets)).toBe("a");
  });

  it("returns null for an empty list", () => {
    expect(resolveDefaultBudgetId([])).toBeNull();
  });
});
