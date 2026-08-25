import { describe, expect, it } from "vitest";
import { validateSourceInput } from "./validate-source";

describe("validateSourceInput", () => {
  it("rejects an unknown type", () => {
    const result = validateSourceInput({ type: "sinking_expense", depositDate: null });
    expect(result).toEqual({ ok: false, error: "Not a valid source type." });
  });

  it("accepts a budget source with no conditional fields", () => {
    expect(validateSourceInput({ type: "budget", depositDate: null })).toEqual({
      ok: true,
    });
  });

  it("accepts a fund source with no conditional fields (it creates its own Fund)", () => {
    expect(validateSourceInput({ type: "fund", depositDate: null })).toEqual({ ok: true });
  });

  describe("past_payment / future_repayment", () => {
    it("requires a deposit date", () => {
      expect(validateSourceInput({ type: "past_payment", depositDate: null }).ok).toBe(false);
      expect(validateSourceInput({ type: "future_repayment", depositDate: null }).ok).toBe(false);
      expect(
        validateSourceInput({ type: "past_payment", depositDate: "2026-01-01" }),
      ).toEqual({ ok: true });
    });
  });

  it("never rejects a negative starting balance (validated separately, if at all)", () => {
    // validateSourceInput has no balance-sign check by design — negative
    // balances are explicitly allowed everywhere in this app.
    expect(validateSourceInput({ type: "budget", depositDate: null }).ok).toBe(true);
  });
});
