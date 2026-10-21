"use server";

import { requireUser } from "@/lib/supabase/auth";
import { getSettings } from "@/lib/queries/settings";
import { selectableMonths } from "@/lib/dashboard-months";
import { currentMonthISO, todayISO } from "@/lib/dates";
import {
  buildBalanceSeries,
  logBalanceDelta,
  type BalanceEvent,
  type BalancePoint,
} from "@/lib/sources/balance-history";

export type SourceDetail = {
  name: string;
  balance: number;
  /** One point per day of the kept window, oldest first. */
  series: BalancePoint[];
  /** Everything that touched this Source in the window, newest first. */
  transactions: { id: string; postedDate: string; description: string; amount: number }[];
};

// What the Sources popup shows: the Source's balance for each day of the
// kept window and the transactions behind it. A transfer row's own amount is
// unsigned (direction lives in transfer_from/to_source_id), so it's signed
// here relative to this Source, as the Float popup does.
export async function getSourceDetail(sourceId: string): Promise<SourceDetail> {
  const { supabase } = await requireUser();
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const windowStart = selectableMonths(currentMonthISO(settings.timezone)).at(-1)!;

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("name, balance")
    .eq("id", sourceId)
    .maybeSingle();
  if (sourceError) throw new Error(sourceError.message);
  if (!source) throw new Error("Source not found.");

  const [recordedRes, txnRes, logRes] = await Promise.all([
    supabase.from("source_balance_days").select("day, balance").eq("source_id", sourceId).gte("day", windowStart),
    supabase
      .from("transactions")
      .select("id, posted_date, description, amount, is_transfer, transfer_to_source_id")
      .or(`source_id.eq.${sourceId},transfer_from_source_id.eq.${sourceId},transfer_to_source_id.eq.${sourceId}`)
      .eq("is_split", false)
      .gte("posted_date", windowStart)
      .order("posted_date", { ascending: false })
      .limit(1000),
    supabase
      .from("activity_log")
      .select("variable, old_value, new_value, created_at")
      .eq("page", "Sources")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (recordedRes.error) throw new Error(recordedRes.error.message);
  if (txnRes.error) throw new Error(txnRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);

  const transactions = (txnRes.data ?? []).map((r) => ({
    id: r.id,
    postedDate: r.posted_date,
    description: r.description,
    amount: r.is_transfer
      ? r.transfer_to_source_id === sourceId
        ? Math.abs(r.amount)
        : -Math.abs(r.amount)
      : r.amount,
  }));

  const events: BalanceEvent[] = transactions.map((t) => ({ date: t.postedDate, delta: t.amount }));
  for (const entry of logRes.data ?? []) {
    const delta = logBalanceDelta(entry, source.name);
    if (delta != null) events.push({ date: entry.created_at.slice(0, 10), delta });
  }

  const series = buildBalanceSeries({
    windowStart,
    today,
    currentBalance: source.balance,
    recorded: (recordedRes.data ?? []).map((r) => ({ day: r.day, balance: r.balance })),
    events,
  });

  return { name: source.name, balance: source.balance, series, transactions };
}
