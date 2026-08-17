import { createClient } from "@/lib/supabase/server";

export async function getAccounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getBankConnections() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("*, accounts(id, account_name)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
