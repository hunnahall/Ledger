"use server";

import { createClient } from "@/lib/supabase/server";
import { currentMonthISO, nextMonthISO } from "@/lib/dates";

export type DashboardTileKind =
  | { type: "category"; categoryId: string }
  | { type: "income" }
  | { type: "other_inflow" }
  | { type: "budgeted_outflow" }
  | { type: "other_outflow" };

export type DashboardTileTransaction = {
  id: string;
  postedDate: string;
  description: string;
  amount: number;
};

// Read-only fetch backing the dashboard's clickable tiles/categories — a
// deliberately light query (no splits, no account/category joins beyond
// what's needed to bucket by source type) since the popup just lists
// transactions, it doesn't edit them. Split transactions' individual line
// items aren't broken out here (their parent row's own category_id/amount
// is null/whole, same simplification the un-split half of
// v_spending_by_category avoids by unioning transaction_splits — not worth
// replicating for a read-only summary popup).
export async function getDashboardTileTransactions(
  kind: DashboardTileKind,
): Promise<DashboardTileTransaction[]> {
  const supabase = await createClient();
  const month = currentMonthISO();
  const nextMonth = nextMonthISO(month);

  let query = supabase
    .from("transactions")
    .select("id, posted_date, description, amount, sources!source_id(type)")
    .gte("posted_date", month)
    .lt("posted_date", nextMonth)
    .eq("is_transfer", false)
    .eq("exclude_from_budget", false)
    .order("posted_date", { ascending: false });

  switch (kind.type) {
    case "category":
      query = query.eq("category_id", kind.categoryId);
      break;
    case "income":
      query = query.eq("is_income", true).gt("amount", 0);
      break;
    case "other_inflow":
      query = query.eq("is_income", false).gt("amount", 0);
      break;
    case "budgeted_outflow":
    case "other_outflow":
      query = query.lt("amount", 0);
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (kind.type === "budgeted_outflow" || kind.type === "other_outflow") {
    const wantBudget = kind.type === "budgeted_outflow";
    rows = rows.filter((r) => {
      const isBudget = (r.sources as { type: string } | null)?.type === "budget";
      return isBudget === wantBudget;
    });
  }

  return rows.map((r) => ({
    id: r.id,
    postedDate: r.posted_date,
    description: r.description,
    amount: r.amount,
  }));
}
