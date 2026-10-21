"use server";

import { requireUser } from "@/lib/supabase/auth";
import { revalidateForecastPages } from "@/lib/actions/revalidate";
import { parseMonthYear } from "@/lib/forecast/month";
import { logMoney, parseMoney } from "@/lib/format";
import { logChange } from "@/lib/actions/log";

// Every change here goes to the Log under "Forecasts".
//
// Everything in this file only ever reads sources/source_transfers — it
// never inserts/updates/deletes them, and never touches transactions.
// Forecast data (forecasts, forecast_entries) is entirely separate from
// the real ledger; the Budgets/Sources pages remain the only place that
// actually changes a Source's balance or its recurring transfer.

export async function createForecast(
  _prevState: { error: string; id?: undefined } | { error?: undefined; id: string } | null,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const sourceId = String(formData.get("source_id") ?? "");
  if (!name) return { error: "Enter a name for the forecast." };
  if (!sourceId) return { error: "Choose a source." };

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("forecasts")
    .insert({ user_id: user.id, name, source_id: sourceId })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logChange(supabase, user.id, "Forecasts", `Forecast: ${name}`, null, "Created");

  revalidateForecastPages();
  return { id: data.id };
}

export async function renameForecast(
  forecastId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the forecast." };

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase.from("forecasts").select("name").eq("id", forecastId).maybeSingle();
  const { error } = await supabase.from("forecasts").update({ name }).eq("id", forecastId);
  if (error) return { error: error.message };

  if (existing && existing.name !== name) {
    await logChange(supabase, user.id, "Forecasts", "Forecast name", existing.name, name);
  }

  revalidateForecastPages();
  return null;
}

export async function updateForecastSource(
  forecastId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const sourceId = String(formData.get("source_id") ?? "");
  if (!sourceId) return { error: "Choose a source." };

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("forecasts")
    .select("name, sources(name)")
    .eq("id", forecastId)
    .maybeSingle();
  const { error } = await supabase
    .from("forecasts")
    .update({ source_id: sourceId })
    .eq("id", forecastId);
  if (error) return { error: error.message };

  const { data: picked } = await supabase.from("sources").select("name").eq("id", sourceId).maybeSingle();
  if (existing && picked) {
    await logChange(
      supabase,
      user.id,
      "Forecasts",
      `Forecast source (${existing.name})`,
      (existing.sources as { name: string } | null)?.name ?? null,
      picked.name,
    );
  }

  revalidateForecastPages();
  return null;
}

export async function updateMonthlyTransferOverride(
  forecastId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  // A cleared field means "fall back to the source's live transfer", which
  // is a null override rather than zero.
  const raw = formData.get("monthly_transfer_override");
  let amount: number | null = null;
  if (raw !== null && raw !== "") {
    const parsed = parseMoney(raw);
    if ("error" in parsed) return parsed;
    amount = parsed.amount;
  }

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("forecasts")
    .select("name, monthly_transfer_override")
    .eq("id", forecastId)
    .maybeSingle();
  const { error } = await supabase
    .from("forecasts")
    .update({ monthly_transfer_override: amount })
    .eq("id", forecastId);
  if (error) return { error: error.message };

  if (existing && existing.monthly_transfer_override !== amount) {
    await logChange(
      supabase,
      user.id,
      "Forecasts",
      `Forecast monthly transfer (${existing.name})`,
      existing.monthly_transfer_override === null ? "Live" : logMoney(existing.monthly_transfer_override, "/mo"),
      amount === null ? "Live" : logMoney(amount, "/mo"),
    );
  }

  revalidateForecastPages();
  return null;
}

export async function updateStartingBalanceOverride(
  forecastId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  // A cleared field means "fall back to the Source's live balance", which
  // is a null override rather than zero — same convention as
  // updateMonthlyTransferOverride.
  const raw = formData.get("starting_balance_override");
  let amount: number | null = null;
  if (raw !== null && raw !== "") {
    const parsed = parseMoney(raw);
    if ("error" in parsed) return parsed;
    amount = parsed.amount;
  }

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("forecasts")
    .select("name, starting_balance_override")
    .eq("id", forecastId)
    .maybeSingle();
  const { error } = await supabase
    .from("forecasts")
    .update({ starting_balance_override: amount })
    .eq("id", forecastId);
  if (error) return { error: error.message };

  if (existing && existing.starting_balance_override !== amount) {
    await logChange(
      supabase,
      user.id,
      "Forecasts",
      `Forecast starting balance (${existing.name})`,
      existing.starting_balance_override === null ? "Live" : logMoney(existing.starting_balance_override),
      amount === null ? "Live" : logMoney(amount),
    );
  }

  revalidateForecastPages();
  return null;
}

export async function deleteForecast(
  forecastId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase.from("forecasts").select("name").eq("id", forecastId).maybeSingle();
  const { error } = await supabase.from("forecasts").delete().eq("id", forecastId);
  if (error) return { error: error.message };

  if (existing) await logChange(supabase, user.id, "Forecasts", `Forecast: ${existing.name}`, "Created", null);

  revalidateForecastPages();
  return null;
}

export async function createForecastEntry(
  forecastId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const monthISO = parseMonthYear(String(formData.get("month") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const isExpense = String(formData.get("type_choice") ?? "expense") === "expense";
  const parsed = parseMoney(formData.get("amount"), { positive: true });

  if (!monthISO) return { error: "Enter the month as mm/yy." };
  if (!description) return { error: "Enter a description." };
  if ("error" in parsed) return parsed;
  const amount = parsed.amount;

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("forecast_entries").insert({
    user_id: user.id,
    forecast_id: forecastId,
    month: monthISO,
    description,
    is_expense: isExpense,
    amount,
  });
  if (error) return { error: error.message };

  const { data: forecast } = await supabase.from("forecasts").select("name").eq("id", forecastId).maybeSingle();
  await logChange(
    supabase,
    user.id,
    "Forecasts",
    `Forecast entry: ${description} (${forecast?.name ?? "forecast"})`,
    null,
    logMoney(isExpense ? -amount : amount),
  );

  revalidateForecastPages();
  return null;
}

export async function updateForecastEntry(
  entryId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const monthISO = parseMonthYear(String(formData.get("month") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const isExpense = String(formData.get("type_choice") ?? "expense") === "expense";
  const parsed = parseMoney(formData.get("amount"), { positive: true });

  if (!monthISO) return { error: "Enter the month as mm/yy." };
  if (!description) return { error: "Enter a description." };
  if ("error" in parsed) return parsed;
  const amount = parsed.amount;

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("forecast_entries")
    .select("description, is_expense, amount, forecasts(name)")
    .eq("id", entryId)
    .maybeSingle();
  const { error } = await supabase
    .from("forecast_entries")
    .update({ month: monthISO, description, is_expense: isExpense, amount })
    .eq("id", entryId);
  if (error) return { error: error.message };

  if (existing) {
    const before = logMoney(existing.is_expense ? -existing.amount : existing.amount);
    const after = logMoney(isExpense ? -amount : amount);
    if (before !== after || existing.description !== description) {
      await logChange(
        supabase,
        user.id,
        "Forecasts",
        `Forecast entry: ${description} (${(existing.forecasts as { name: string } | null)?.name ?? "forecast"})`,
        before,
        after,
      );
    }
  }

  revalidateForecastPages();
  return null;
}

export async function deleteForecastEntry(
  entryId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("forecast_entries")
    .select("description, is_expense, amount, forecasts(name)")
    .eq("id", entryId)
    .maybeSingle();
  const { error } = await supabase.from("forecast_entries").delete().eq("id", entryId);
  if (error) return { error: error.message };

  if (existing) {
    await logChange(
      supabase,
      user.id,
      "Forecasts",
      `Forecast entry: ${existing.description} (${(existing.forecasts as { name: string } | null)?.name ?? "forecast"})`,
      logMoney(existing.is_expense ? -existing.amount : existing.amount),
      null,
    );
  }

  revalidateForecastPages();
  return null;
}
