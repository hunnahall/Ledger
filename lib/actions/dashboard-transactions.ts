"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { nextMonthISO } from "@/lib/dates";
import { getLegs } from "@/lib/queries/legs";
import { addDays } from "@/lib/charts/heatmap";
import {
  isCategorizedIncome,
  isExpense,
  isIncome,
  isInflow,
  isOtherInflow,
  isOtherOutflow,
  isOutflow,
  type Leg,
} from "@/lib/transactions/legs";

export type DashboardTileKind =
  | { type: "category"; categoryId: string }
  | { type: "income" }
  | { type: "other_inflows" }
  | { type: "inflows" }
  | { type: "expense" }
  | { type: "other_outflows" }
  | { type: "outflows" }
  | { type: "budget_net" }
  | { type: "cash_flow" }
  | { type: "float" }
  | { type: "source"; sourceId: string }
  | { type: "day"; date: string };

export type DashboardTileTransaction = {
  id: string;
  postedDate: string;
  description: string;
  amount: number;
};

// Read-only fetch backing the dashboard's clickable tiles/categories: the
// popup lists the transactions behind a figure. Split originals are always
// left out; their pieces are ordinary transactions and list like any other.
const MONTH_RE = /^\d{4}-\d{2}-01$/;

export async function getDashboardTileTransactions(
  kind: DashboardTileKind,
  // The months the Dashboard has selected (YYYY-MM-01), required rather
  // than defaulted: "this month" depends on the account's settings.timezone,
  // which the page already resolved to render the figure this explains.
  months: string[],
): Promise<DashboardTileTransaction[]> {
  // RLS scopes every query below, but without this an unauthenticated call
  // returned an empty list as though the user simply had no transactions.
  const { supabase } = await requireUser();

  if (months.length === 0 || months.length > 12 || !months.every((m) => MONTH_RE.test(m))) {
    throw new Error("Invalid months.");
  }
  const sorted = [...months].sort();
  const selected = new Set(sorted);
  const from = sorted[0];
  const to = nextMonthISO(sorted[sorted.length - 1]);
  const inSelection = (date: string) => selected.has(`${date.slice(0, 7)}-01`);

  // Float's tile is a running balance (never reset monthly, unlike every
  // other tile here), so its breakdown has to be all-time to actually sum
  // to the balance shown. Every other kind, "source" included, stays scoped
  // to the selected months, matching the figure it explains.
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
    // Outflows only — Source Allocation shows gross spending per source
    // (getDashboardData's sourceOutflows), so money coming into the source
    // isn't listed and the popup sums to that source's slice.
    const { data, error } = await supabase
      .from("transactions")
      .select("id, posted_date, description, amount")
      .eq("source_id", kind.sourceId)
      .eq("is_transfer", false)
      .eq("exclude_from_budget", false)
      .eq("is_split", false)
      .lt("amount", 0)
      .gte("posted_date", from)
      .lt("posted_date", to)
      .order("posted_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).filter((r) => inSelection(r.posted_date)).map((r) => ({
      id: r.id,
      postedDate: r.posted_date,
      description: r.description,
      amount: r.amount,
    }));
  }

  // One heatmap square: that day's outflows, the same rule the heatmap
  // counts, so the list sums to the square's amount.
  if (kind.type === "day") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(kind.date)) throw new Error("Invalid date.");
    const legs = await getLegs(supabase, kind.date, addDays(kind.date, 1));
    return legs
      .filter(isOutflow)
      .map((l) => ({ id: l.id, postedDate: l.postedDate, description: l.description, amount: l.amount }));
  }

  // Every other kind reads the same rows the dashboard views count, so a
  // popup always sums to the figure it explains.
  const legs = (await getLegs(supabase, from, to)).filter((l) => inSelection(l.postedDate));
  const matches: Record<Exclude<DashboardTileKind["type"], "float" | "source" | "category" | "day">, (l: Leg) => boolean> = {
    income: isIncome,
    other_inflows: isOtherInflow,
    inflows: isInflow,
    expense: isExpense,
    other_outflows: isOtherOutflow,
    outflows: isOutflow,
    // budgetNet = allocation - expense + categorizedIncome. Allocation is the
    // budget's commitments, not money that moved, so only the other two terms
    // have transactions to list.
    budget_net: (l) => isExpense(l) || isCategorizedIncome(l),
    // cashFlow = inflows - outflows.
    cash_flow: (l) => isInflow(l) || isOutflow(l),
  };

  // v_spending_by_category scopes to the Budget source, so a category only
  // counts while the leg is sourced from it.
  const keep =
    kind.type === "category"
      ? (l: Leg) => l.categoryId === kind.categoryId && l.sourceType === "budget"
      : matches[kind.type];

  return legs
    .filter(keep)
    .sort((a, b) => b.postedDate.localeCompare(a.postedDate))
    .map((l) => ({ id: l.id, postedDate: l.postedDate, description: l.description, amount: l.amount }));
}

// All-time transaction list for the Float source's running balance: every
// transaction booked to it plus any transfer in or out, since
// sources.balance is kept in sync with both by the DB triggers. Split
// originals are skipped (their balance moves with their pieces, which are
// listed like any other transaction).
async function getSourceTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceId: string,
): Promise<DashboardTileTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, posted_date, description, amount, is_transfer, transfer_from_source_id, transfer_to_source_id")
    .or(`source_id.eq.${sourceId},transfer_from_source_id.eq.${sourceId},transfer_to_source_id.eq.${sourceId}`)
    .eq("is_split", false)
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
