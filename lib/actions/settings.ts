"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { revalidateLedgerPages } from "@/lib/actions/revalidate";
import { logChange } from "@/lib/actions/log";
import { normalizeLayout, type DashboardLayout } from "@/lib/dashboard-layout";

export async function updateDecimalPlaces(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const decimalPlaces = Number(formData.get("decimal_places") ?? 2);
  if (![0, 1, 2].includes(decimalPlaces)) return { error: "Not a valid number of decimal places." };

  const { supabase, user } = await requireUser();

  const { data: before } = await supabase.from("settings").select("decimal_places").eq("user_id", user.id).maybeSingle();
  const { error } = await supabase
    .from("settings")
    .update({ decimal_places: decimalPlaces })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (before && before.decimal_places !== decimalPlaces) {
    await logChange(supabase, user.id, "Settings", "Decimal places", String(before.decimal_places), String(decimalPlaces));
  }

  revalidateLedgerPages();
  revalidatePath("/settings");
  revalidatePath("/accounts");
  return null;
}

export async function updateBudgetType(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const budgetType = formData.get("budget_type");
  if (budgetType !== "rolling" && budgetType !== "advanced") {
    return { error: "Choose Rolling or Advanced." };
  }

  const { supabase, user } = await requireUser();

  const { data: before } = await supabase.from("settings").select("budget_type").eq("user_id", user.id).maybeSingle();
  const { error } = await supabase
    .from("settings")
    .update({ budget_type: budgetType })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (before && before.budget_type !== budgetType) {
    await logChange(supabase, user.id, "Settings", "Budget type", before.budget_type, budgetType);
  }

  // No catch-up needed when switching modes: income tracks to the Income
  // source either way (route_income_to_source). The switch only changes what
  // ensure_month_current does with that balance when the next month starts.

  revalidateLedgerPages();
  revalidatePath("/settings");
  return null;
}

// Set from the Settings picker, and once automatically on first sign-in
// (see components/settings/timezone-sync.tsx). Everything that asks "what
// month is it" — the budget reset, the income sweep, the sinking-fund
// contribution, the dashboard's month scoping — resolves through this.
export async function updateTimezone(timeZone: string): Promise<{ error: string } | null> {
  if (!timeZone) return { error: "Choose a time zone." };

  // settings_validate_timezone_trigger is the real gate (it checks
  // pg_timezone_names), but rejecting here too keeps an obviously bad value
  // from costing a round trip.
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    return { error: "Not a valid time zone." };
  }

  const { supabase, user } = await requireUser();

  const { data: before } = await supabase.from("settings").select("timezone").eq("user_id", user.id).maybeSingle();
  const { error } = await supabase
    .from("settings")
    .update({ timezone: timeZone })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (before && before.timezone !== timeZone) {
    await logChange(supabase, user.id, "Settings", "Time zone", before.timezone, timeZone);
  }

  revalidateLedgerPages();
  revalidatePath("/settings");
  revalidatePath("/forecasts");
  return null;
}

// The Dashboard's tile order, widths and hidden tiles, saved as the user
// rearranges them. Checked by normalizeLayout so nothing malformed is stored.
// No revalidation: the grid already shows the change, and the next render
// reads it back.
export async function saveDashboardLayout(layout: DashboardLayout): Promise<{ error: string } | null> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("settings")
    .update({ dashboard_layout: normalizeLayout(layout) })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return null;
}
