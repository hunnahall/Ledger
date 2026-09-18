import { createClient } from "@/lib/supabase/server";

export async function getAccounts() {
  const supabase = await createClient();
  // Named columns rather than "*": available_balance, provider_account_id
  // and bank_connection_id are written by the simplefin-sync edge function
  // and read by nothing in the app.
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_name, account_type, institution_name, last4, current_balance, is_manual, status")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getBankConnections() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("id, status, last_synced_at, accounts(id, account_name)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
