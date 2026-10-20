import type { createClient } from "@/lib/supabase/server";
import type { Leg } from "@/lib/transactions/legs";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Every transaction the dashboard views count, posted in [fromISO, toISO):
// transfers and Excluded transactions left out, and split originals left
// out too, since a split's pieces are transactions of their own. Source
// types come from one small lookup so each row can be classified without a
// join per row.
export async function getLegs(supabase: Supabase, fromISO: string, toISO: string): Promise<Leg[]> {
  const [txnRes, sourceRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, posted_date, description, amount, is_income, category_id, source_id")
      .gte("posted_date", fromISO)
      .lt("posted_date", toISO)
      .eq("is_transfer", false)
      .eq("exclude_from_budget", false)
      .eq("is_split", false),
    supabase.from("sources").select("id, type"),
  ]);
  for (const res of [txnRes, sourceRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const typeById = new Map((sourceRes.data ?? []).map((s) => [s.id, s.type as string]));
  const sourceType = (id: string | null) => (id ? (typeById.get(id) ?? null) : null);

  return (txnRes.data ?? []).map((t) => ({
    id: t.id,
    postedDate: t.posted_date,
    description: t.description,
    amount: t.amount,
    isIncome: t.is_income,
    categoryId: t.category_id,
    sourceId: t.source_id,
    sourceType: sourceType(t.source_id),
  }));
}
