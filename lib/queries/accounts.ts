import { createClient } from "@/lib/supabase/server";

export async function getAccounts() {
  const supabase = await createClient();
  // Named columns rather than "*": available_balance, provider_account_id
  // and bank_connection_id are written by the simplefin-sync edge function
  // and read by nothing in the app.
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, account_name, account_type, institution_name, last4, current_balance, is_manual, include_in_cash, status, updated_at, bank_connection_id",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// The latest transactions for each account (shown when its row is opened on
// the Accounts page), as the bank reports them. One small query per account keeps a quiet account from
// being crowded out by a busy one in a shared "latest N" window.
export async function getRecentTransactionsByAccount(accountIds: string[], perAccount = 8) {
  const supabase = await createClient();
  const results = await Promise.all(
    accountIds.map(async (accountId) => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, posted_date, description, amount")
        .eq("account_id", accountId)
        // The bank's own rows: a split original shows whole, its pieces don't.
        .is("split_parent_id", null)
        .order("posted_date", { ascending: false })
        .limit(perAccount);
      if (error) throw new Error(error.message);
      return [accountId, data ?? []] as const;
    }),
  );
  return new Map(results);
}

export async function getBankConnections() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("id, status, last_synced_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
