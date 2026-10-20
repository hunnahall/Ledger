type CashAccount = { current_balance: number; include_in_cash: boolean };

// Every dollar should sit in a Source, so cash in the counted accounts minus
// the sum of every Source balance should be 0. Positive is money no Source
// holds yet (unassigned); negative is Sources holding more than the accounts
// do (over-assigned, usually a Source that drifted or an account left out).
// Float needs no special case: a reimbursable expense lowers the bank
// balance and the Float balance by the same amount.
export function unassignedCash(accounts: CashAccount[], sourceBalances: number[]): number {
  const cash = accounts.reduce((sum, a) => (a.include_in_cash ? sum + a.current_balance : sum), 0);
  const held = sourceBalances.reduce((sum, b) => sum + b, 0);
  return Math.round((cash - held) * 100) / 100;
}

// Safe to Spend: what's left in the Budget, plus any unassigned cash (money
// in the bank that no Source has claimed). Over-assignment isn't subtracted;
// the tile shows that gap on its own.
export function safeToSpend(budgetBalance: number, unassigned: number): number {
  return Math.round((budgetBalance + Math.max(unassigned, 0)) * 100) / 100;
}
