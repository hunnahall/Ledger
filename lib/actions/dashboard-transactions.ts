"use server";

import { createClient } from "@/lib/supabase/server";
import { currentMonthISO, nextMonthISO } from "@/lib/dates";

export type DashboardTileKind =
  | { type: "category"; categoryId: string }
  | { type: "income" }
  | { type: "other_inflow" }
  | { type: "budgeted_outflow" }
  | { type: "other_outflow" }
  | { type: "budget_net" }
  | { type: "total_net" }
  | { type: "float" }
  | { type: "source"; sourceId: string };

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

  // Float's tile is a running balance (never reset monthly, unlike every
  // other tile here), so its breakdown has to be all-time to actually sum
  // to the balance shown — every other kind, "source" included, stays
  // scoped to the current month, matching the month-scoped figure it
  // explains (v_spending_by_source for "source").
  if (kind.type === "float") {
    const { data: floatSource, error: floatSourceError } = await supabase
      .from("sources")
      .select("id")
      .eq("type", "float")
      .maybeSingle();
    if (floatSourceError) throw new Error(floatSourceError.message);
    if (!floatSource) return [];
    return getSourceTransactions(supabase, floatSource.id);
  }

  if (kind.type === "source") {
    // No amount-sign filter — v_spending_by_source nets any inflow (a
    // refund, reimbursement, income) tied to this Source against its
    // outflows, so this popup has to list both sides to sum to the same
    // total the tile shows.
    const { data, error } = await supabase
      .from("transactions")
      .select("id, posted_date, description, amount")
      .eq("source_id", kind.sourceId)
      .eq("is_transfer", false)
      .eq("exclude_from_budget", false)
      .gte("posted_date", month)
      .lt("posted_date", nextMonth)
      .order("posted_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      postedDate: r.posted_date,
      description: r.description,
      amount: r.amount,
    }));
  }

  let query = supabase
    .from("transactions")
    .select("id, posted_date, description, amount, is_income, sources!source_id(type)")
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
    // budget_net (income - budgeted outflows) and total_net (every inflow
    // minus every outflow) don't need an amount-sign filter at the DB level
    // — they're unioning multiple of the kinds above, filtered in JS below
    // instead so one query covers all of it.
    case "budget_net":
    case "total_net":
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (kind.type === "category") {
    // Mirrors v_spending_by_category, which scopes to the reserved Budget
    // source — a category only applies while a row's Source is Budget (see
    // transaction-list.tsx), so a category_id surviving on a row whose
    // Source has since moved off Budget (stale pre-fix data, or a future
    // regression) shouldn't leak into this popup even though it's excluded
    // from the tile's own total already.
    rows = rows.filter((r) => (r.sources as { type: string } | null)?.type === "budget");
  } else if (kind.type === "budgeted_outflow" || kind.type === "other_outflow") {
    const wantBudget = kind.type === "budgeted_outflow";
    rows = rows.filter((r) => {
      const isBudget = (r.sources as { type: string } | null)?.type === "budget";
      return isBudget === wantBudget;
    });
  } else if (kind.type === "budget_net") {
    // Same two components computeDashboardTotals sums for budgetNet —
    // income transactions plus budget-sourced expenses, nothing else.
    rows = rows.filter((r) => {
      if (r.is_income) return r.amount > 0;
      return r.amount < 0 && (r.sources as { type: string } | null)?.type === "budget";
    });
  } else if (kind.type === "total_net") {
    // totalNet = income + otherInflow - budgetedOutflow - otherOutflow, and
    // budgetedOutflow/otherOutflow both come from v_outflow_by_bucket, which
    // silently drops any outflow with no source at all (`where source_type
    // is not null`) — inflows have no such requirement. Mirror that here so
    // this sums to the exact same figure the tile shows, not a superset of
    // it that happens to include sourceless expenses the tile itself never
    // counted.
    rows = rows.filter((r) => r.amount > 0 || r.sources !== null);
  }

  return rows.map((r) => ({
    id: r.id,
    postedDate: r.posted_date,
    description: r.description,
    amount: r.amount,
  }));
}

// All-time transaction list for the Float source's running balance — every
// transaction booked to it plus any transfer in/out, since sources.balance
// is kept in sync with both by the DB triggers in
// transactions_sync_transfer_balance/sync_source_or_fund_balance.
async function getSourceTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceId: string,
): Promise<DashboardTileTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, posted_date, description, amount, is_transfer, transfer_from_source_id, transfer_to_source_id")
    .or(`source_id.eq.${sourceId},transfer_from_source_id.eq.${sourceId},transfer_to_source_id.eq.${sourceId}`)
    .order("posted_date", { ascending: false });
  if (error) throw new Error(error.message);

  // A transfer row's own `amount` is an unsigned magnitude (direction is in
  // transfer_from/to_source_id) — sign it relative to this source so the
  // list reads the same way "amount < 0 ? negative : positive" does
  // everywhere else.
  return (data ?? []).map((r) => {
    const amount = r.is_transfer
      ? r.transfer_to_source_id === sourceId
        ? Math.abs(r.amount)
        : -Math.abs(r.amount)
      : r.amount;
    return { id: r.id, postedDate: r.posted_date, description: r.description, amount };
  });
}
