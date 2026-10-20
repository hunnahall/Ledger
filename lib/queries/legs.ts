import type { createClient } from "@/lib/supabase/server";
import type { Leg } from "@/lib/transactions/legs";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Every transaction the dashboard views count, posted in [fromISO, toISO):
// transfers and Excluded transactions left out, and split originals left
// out too, since a split's pieces are transactions of their own. Source
// types come from one small lookup so each row can be classified without a
// join per row.
// Pass `sources` when the caller already has every Source's type, to skip
// reading them again.
export async function getLegs(
  supabase: Supabase,
  fromISO: string,
  toISO: string,
  sources?: { id: string; type: string | null }[],
): Promise<Leg[]> {
  const [rows, sourceRes] = await Promise.all([
    fetchAllPages((from, to) =>
      supabase
        .from("transactions")
        .select("id, posted_date, description, amount, is_income, category_id, source_id")
        .gte("posted_date", fromISO)
        .lt("posted_date", toISO)
        .eq("is_transfer", false)
        .eq("exclude_from_budget", false)
        .eq("is_split", false)
        .order("id")
        .range(from, to),
    ),
    sources ? { data: sources, error: null } : supabase.from("sources").select("id, type"),
  ]);
  if (sourceRes.error) throw new Error(sourceRes.error.message);

  const typeById = new Map((sourceRes.data ?? []).map((s) => [s.id, s.type as string]));
  const sourceType = (id: string | null) => (id ? (typeById.get(id) ?? null) : null);

  return rows.map((t) => ({
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

// Supabase returns at most 1,000 rows per request, and a multi-month range
// (the Dashboard's heatmap spans five months) can hold more, so read page
// by page until a short page comes back.
const PAGE = 1000;
async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}
