type AccountLike = { account_type: string; current_balance: number };

// The Accounts page stat row. Cash is checking, savings and manual accounts
// (a wallet, a cash envelope); credit cards are their own figure. Balances
// are summed as stored, so a card's debt (negative from SimpleFin) lowers
// Net. Covers only the accounts Ledger knows about, connected or manual.
export function accountTotals(accounts: AccountLike[]) {
  let cash = 0;
  let credit = 0;
  for (const account of accounts) {
    if (account.account_type === "credit_card") credit += account.current_balance;
    else cash += account.current_balance;
  }
  return { cash, credit, net: cash + credit };
}
