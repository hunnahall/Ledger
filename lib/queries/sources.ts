import { createClient } from "@/lib/supabase/server";

export async function getSourcesWithBalance() {
  const supabase = await createClient();
  const [
    { data: sources, error: sourcesError },
    { data: links, error: linksError },
    { data: funds, error: fundsError },
  ] = await Promise.all([
    supabase.from("sources").select("*").is("archived_at", null).order("created_at", { ascending: true }),
    supabase.from("source_funds").select("source_id, fund_id"),
    supabase.from("funds").select("id, name, balance"),
  ]);

  if (sourcesError) throw new Error(sourcesError.message);
  if (linksError) throw new Error(linksError.message);
  if (fundsError) throw new Error(fundsError.message);

  const fundById = new Map((funds ?? []).map((f) => [f.id, f]));
  const fundIdBySourceId = new Map((links ?? []).map((l) => [l.source_id, l.fund_id]));

  return (sources ?? []).map((source) => {
    const linkedFund =
      source.type === "fund" ? fundById.get(fundIdBySourceId.get(source.id) ?? "") : undefined;
    return {
      ...source,
      balance: linkedFund ? linkedFund.balance : source.balance,
      fundName: linkedFund?.name ?? null,
    };
  });
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

export async function getFunds() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
