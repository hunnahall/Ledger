type AccountLike = { account_type: string; current_balance: number; include_in_cash: boolean };

// The Accounts page stat row. Cash is checking, savings and manual accounts
// (a wallet, a cash envelope); credit cards are their own figure. Balances
// are summed as stored, so a card's debt (negative from SimpleFin) lowers
// Net. Accounts the user left out of cash (Count as cash off) aren't in
// any of the three, matching Safe to Spend.
export function accountTotals(accounts: AccountLike[]) {
  let cash = 0;
  let credit = 0;
  for (const account of accounts) {
    if (!account.include_in_cash) continue;
    if (account.account_type === "credit_card") credit += account.current_balance;
    else cash += account.current_balance;
  }
  return { cash, credit, net: cash + credit };
}
