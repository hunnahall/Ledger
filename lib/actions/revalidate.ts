import { revalidatePath } from "next/cache";

// The same three- and four-path revalidate clusters were repeated verbatim
// across the action files (simplefin.ts alone had the identical four-line
// block three times). Naming them makes each action's blast radius legible
// and keeps the sets from drifting apart.

// The (app) layout carries the Transactions nav badge (how many need a
// Source), so anything that can change that count refreshes it too.
function revalidateAppLayout() {
  revalidatePath("/(app)", "layout");
}

// Anything that changes a transaction, a balance, or a source: the ledger
// pages that read them all need refetching.
export function revalidateLedgerPages() {
  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidateAppLayout();
}

// Bank connections live on Accounts; a sync also lands new transactions and
// moves balances.
export function revalidateBankPages() {
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidateAppLayout();
}

// Rules have their own page, unaffected by the ledger revalidations above;
// without this a rule created or reinforced elsewhere sits invisible there
// until something else refetches it. Running rules can fill in Sources, so
// the nav badge follows.
export function revalidateRulePages() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/rules");
  revalidateAppLayout();
}

export function revalidateForecastPages() {
  revalidatePath("/forecasts");
}
