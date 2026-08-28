import { createClient } from "@/lib/supabase/server";

export async function getSourcesWithBalance() {
  const supabase = await createClient();
  const { data: sources, error } = await supabase
    .from("sources")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return sources ?? [];
}

// For pickers that need "an existing Source to point at" (Source Transfers)
// rather than the full balance/fund-join shape getSourcesWithBalance
// builds. Excludes the auto-managed Budget source — routing a transfer
// into the thing that resets itself every month doesn't make sense.
export async function getSourceOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id, name")
    .is("archived_at", null)
    .neq("type", "budget")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
