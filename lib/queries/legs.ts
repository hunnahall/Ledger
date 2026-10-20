import type { createClient } from "@/lib/supabase/server";
import type { Leg } from "@/lib/transactions/legs";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Every leg (non-split transaction or split leg) posted in [fromISO, toISO),
// transfers and Excluded transactions left out: the exact set of rows the
// dashboard views count. Source types come from one small lookup so each leg
// can be classified without a join per row.
export async function getLegs(supabase: Supabase, fromISO: string, toISO: string): Promise<Leg[]> {
  const [plainRes, splitRes, sourceRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, posted_date, description, amount, is_income, category_id, source_id")
      .gte("posted_date", fromISO)
      .lt("posted_date", toISO)
      .eq("is_transfer", false)
      .eq("exclude_from_budget", false)
      .eq("is_split", false),
    supabase
      .from("transaction_splits")
      .select(
        "id, amount, category_id, source_id, transactions!inner(posted_date, description, is_income, is_transfer, exclude_from_budget)",
      )
      .gte("transactions.posted_date", fromISO)
      .lt("transactions.posted_date", toISO)
      .eq("transactions.is_transfer", false)
      .eq("transactions.exclude_from_budget", false),
    supabase.from("sources").select("id, type"),
  ]);
  for (const res of [plainRes, splitRes, sourceRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const typeById = new Map((sourceRes.data ?? []).map((s) => [s.id, s.type as string]));
  const sourceType = (id: string | null) => (id ? (typeById.get(id) ?? null) : null);

  const plain: Leg[] = (plainRes.data ?? []).map((t) => ({
    id: t.id,
    postedDate: t.posted_date,
    description: t.description,
    amount: t.amount,
    isIncome: t.is_income,
    categoryId: t.category_id,
    sourceId: t.source_id,
    sourceType: sourceType(t.source_id),
  }));

  const splits: Leg[] = (splitRes.data ?? []).map((s) => {
    const parent = s.transactions as { posted_date: string; description: string; is_income: boolean };
    return {
      id: s.id,
      postedDate: parent.posted_date,
      description: parent.description,
      amount: s.amount,
      isIncome: parent.is_income,
      categoryId: s.category_id,
      sourceId: s.source_id,
      sourceType: sourceType(s.source_id),
    };
  });

  return [...plain, ...splits];
}
