import { describe, expect, it } from "vitest";
import { accountTotals } from "./totals";

describe("accountTotals", () => {
  it("counts checking, savings and manual accounts as cash", () => {
    const totals = accountTotals([
      { account_type: "checking", current_balance: 1200, include_in_cash: true },
      { account_type: "savings", current_balance: 5000, include_in_cash: true },
      { account_type: "manual", current_balance: 40, include_in_cash: true },
    ]);
    expect(totals).toEqual({ cash: 6240, credit: 0, net: 6240 });
  });

  it("keeps credit cards apart and nets their debt against cash", () => {
    const totals = accountTotals([
      { account_type: "checking", current_balance: 1200, include_in_cash: true },
      { account_type: "credit_card", current_balance: -450.5, include_in_cash: true },
    ]);
    expect(totals).toEqual({ cash: 1200, credit: -450.5, net: 749.5 });
  });

  it("skips accounts not counted as cash", () => {
    const totals = accountTotals([
      { account_type: "checking", current_balance: 1200, include_in_cash: true },
      { account_type: "savings", current_balance: 90000, include_in_cash: false },
    ]);
    expect(totals).toEqual({ cash: 1200, credit: 0, net: 1200 });
  });

  it("is all zeros with no accounts", () => {
    expect(accountTotals([])).toEqual({ cash: 0, credit: 0, net: 0 });
  });
});
