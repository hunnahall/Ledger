"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { revalidateLedgerPages } from "@/lib/actions/revalidate";

export async function updateDecimalPlaces(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const decimalPlaces = Number(formData.get("decimal_places") ?? 2);
  if (![0, 1, 2].includes(decimalPlaces)) return { error: "Not a valid number of decimal places." };

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("settings")
    .update({ decimal_places: decimalPlaces })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidateLedgerPages();
  revalidatePath("/settings");
  revalidatePath("/accounts");
  return null;
}

export async function updateMonthAhead(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const monthAhead = formData.get("month_ahead") === "on";

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("settings")
    .update({ month_ahead: monthAhead })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (monthAhead) {
    // Turning this on only changes behavior going forward (see
    // route_income_to_fund) — anything already marked as income this
    // month from before the mode was on would otherwise just sit there
    // as a label instead of actually landing in the fund that's about to
    // be swept into the budget. One-time catch-up, current month only.
    const { error: catchUpError } = await supabase.rpc("route_current_month_income_to_fund");
    if (catchUpError) return { error: catchUpError.message };
  }

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

  const { error } = await supabase
    .from("settings")
    .update({ timezone: timeZone })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidateLedgerPages();
  revalidatePath("/settings");
  revalidatePath("/forecast");
  return null;
}
