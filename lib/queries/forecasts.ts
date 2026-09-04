import { createClient } from "@/lib/supabase/server";

export async function getForecasts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forecasts")
    .select("id, name, source_id, updated_at, sources(name)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    sourceId: f.source_id,
    sourceName: (f.sources as { name: string } | null)?.name ?? "",
    updatedAt: f.updated_at,
  }));
}

// Live lookup, not a cached amount on the forecast row — a forecast must
// never drift from whatever's actually configured on the Budgets page.
async function getSourceTransferAmount(sourceId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_transfers")
    .select("amount")
    .eq("source_id", sourceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.amount ?? null;
}

export async function getForecast(id: string) {
  const supabase = await createClient();

  const { data: forecast, error: forecastError } = await supabase
    .from("forecasts")
    .select("id, name, source_id, monthly_transfer_override, starting_balance_override")
    .eq("id", id)
    .maybeSingle();
  if (forecastError) throw new Error(forecastError.message);
  if (!forecast) return null;

  const [{ data: entries, error: entriesError }, { data: source, error: sourceError }, liveTransfer] =
    await Promise.all([
      supabase
        .from("forecast_entries")
        .select("id, month, description, is_expense, amount, updated_at")
        .eq("forecast_id", id)
        .order("month", { ascending: true }),
      supabase.from("sources").select("name, balance").eq("id", forecast.source_id).maybeSingle(),
      getSourceTransferAmount(forecast.source_id),
    ]);
  if (entriesError) throw new Error(entriesError.message);
  if (sourceError) throw new Error(sourceError.message);

  const transferIsLive = liveTransfer !== null;
  const effectiveMonthlyTransfer = liveTransfer ?? forecast.monthly_transfer_override ?? 0;

  const sourceBalance = source?.balance ?? 0;
  const startingBalanceOverride = forecast.starting_balance_override;
  const effectiveStartingBalance = startingBalanceOverride ?? sourceBalance;

  return {
    id: forecast.id,
    name: forecast.name,
    sourceId: forecast.source_id,
    sourceName: source?.name ?? "",
    sourceBalance,
    startingBalanceOverride,
    effectiveStartingBalance,
    monthlyTransferOverride: forecast.monthly_transfer_override,
    transferIsLive,
    effectiveMonthlyTransfer,
    entries: (entries ?? []).map((e) => ({
      id: e.id,
      month: e.month,
      description: e.description,
      isExpense: e.is_expense,
      amount: e.amount,
      updatedAt: e.updated_at,
    })),
  };
}
