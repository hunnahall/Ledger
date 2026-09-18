import { revalidatePath } from "next/cache";

// The same three- and four-path revalidate clusters were repeated verbatim
// across the action files (simplefin.ts alone had the identical four-line
// block three times). Naming them makes each action's blast radius legible
// and keeps the sets from drifting apart.

// Anything that changes a transaction, a balance, or a source: the ledger
// pages that read them all need refetching.
export function revalidateLedgerPages() {
  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

// Bank connections live on both Accounts and Settings; a sync also lands
// new transactions and moves balances.
export function revalidateBankPages() {
  revalidatePath("/accounts");
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// Settings has its own cached route, unaffected by the ledger revalidations
// above — without this a rule created or reinforced elsewhere sits
// invisible there until something else happens to refetch that page.
export function revalidateVendorRulePages() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export function revalidateForecastPages() {
  revalidatePath("/forecast");
}
