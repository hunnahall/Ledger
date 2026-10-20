import { describe, expect, it } from "vitest";
import { safeToSpend, unassignedCash } from "./unassigned-cash";

const acct = (current_balance: number, include_in_cash = true) => ({ current_balance, include_in_cash });

describe("unassignedCash", () => {
  it("is 0 when every dollar sits in a Source", () => {
    expect(unassignedCash([acct(1000), acct(500)], [1200, 300])).toBe(0);
  });

  it("is positive when the accounts hold money no Source has claimed", () => {
    expect(unassignedCash([acct(1000)], [700])).toBe(300);
  });

  it("is negative when Sources hold more than the accounts", () => {
    expect(unassignedCash([acct(1000)], [1250.5])).toBe(-250.5);
  });

  it("counts a credit card's debt against cash", () => {
    // $2,000 in checking, $300 owed on a card: $1,700 of real cash.
    expect(unassignedCash([acct(2000), acct(-300)], [1700])).toBe(0);
  });

  it("leaves out accounts not counted as cash", () => {
    expect(unassignedCash([acct(1000), acct(50000, false)], [1000])).toBe(0);
  });

  it("rounds to the cent", () => {
    expect(unassignedCash([acct(0.1), acct(0.2)], [0.3])).toBe(0);
  });
});

describe("safeToSpend", () => {
  it("adds unassigned cash to what's left in the Budget", () => {
    expect(safeToSpend(800, 200)).toBe(1000);
  });

  it("doesn't subtract an over-assigned gap", () => {
    expect(safeToSpend(800, -500)).toBe(800);
  });
});
