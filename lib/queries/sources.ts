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

// Each Source's net change from this month's transactions (money in minus
// money out, transfers and Excluded rows left out), from
// v_spending_by_source. Balance edits, Source Transfers and the month-start
// roll-forward aren't transactions, so they aren't in it.
export async function getSourceMonthChange(monthISO: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_spending_by_source")
    .select("source_id, amount")
    .eq("month", monthISO);
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).flatMap((r) => (r.source_id ? [[r.source_id, r.amount ?? 0] as const] : [])),
  );
}
