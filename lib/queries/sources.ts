import { createClient } from "@/lib/supabase/server";

export async function getSourcesWithContributions() {
  const supabase = await createClient();
  const [{ data: sources, error: sourcesError }, { data: contributions, error: contributionsError }] =
    await Promise.all([
      supabase
        .from("sources")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("source_contributions")
        .select("*")
        .order("target_month", { ascending: true }),
    ]);

  if (sourcesError) throw new Error(sourcesError.message);
  if (contributionsError) throw new Error(contributionsError.message);

  return (sources ?? []).map((source) => {
    const sourceContributions = (contributions ?? []).filter(
      (c) => c.source_id === source.id,
    );
    const pulledForwardTotal = sourceContributions
      .filter((c) => c.pulled_forward)
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      ...source,
      contributions: sourceContributions,
      availableBalance: source.balance + pulledForwardTotal,
    };
  });
}
