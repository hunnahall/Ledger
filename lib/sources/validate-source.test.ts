import { describe, expect, it } from "vitest";
import { validateSourceInput } from "./validate-source";

describe("validateSourceInput", () => {
  it("rejects an unknown type", () => {
    const result = validateSourceInput({ type: "sinking_fund", fundIds: [], depositDate: null });
    expect(result).toEqual({ ok: false, error: "Not a valid source type." });
  });

  it("accepts a budget source with no conditional fields", () => {
    expect(validateSourceInput({ type: "budget", fundIds: [], depositDate: null })).toEqual({
      ok: true,
    });
  });

  describe("fund type", () => {
    it("requires exactly one fund id", () => {
      expect(validateSourceInput({ type: "fund", fundIds: [], depositDate: null }).ok).toBe(false);
      expect(
        validateSourceInput({ type: "fund", fundIds: ["a", "b"], depositDate: null }).ok,
      ).toBe(false);
      expect(validateSourceInput({ type: "fund", fundIds: ["a"], depositDate: null })).toEqual({
        ok: true,
      });
    });
  });

  describe("past_payment / future_repayment", () => {
    it("requires a deposit date", () => {
      expect(
        validateSourceInput({ type: "past_payment", fundIds: [], depositDate: null }).ok,
      ).toBe(false);
      expect(
        validateSourceInput({ type: "future_repayment", fundIds: [], depositDate: null }).ok,
      ).toBe(false);
      expect(
        validateSourceInput({ type: "past_payment", fundIds: [], depositDate: "2026-01-01" }),
      ).toEqual({ ok: true });
    });
  });

  it("never rejects a negative starting balance (validated separately, if at all)", () => {
    // validateSourceInput has no balance-sign check by design — negative
    // balances are explicitly allowed everywhere in this app.
    expect(validateSourceInput({ type: "budget", fundIds: [], depositDate: null }).ok).toBe(true);
  });
});
