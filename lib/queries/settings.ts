import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE } from "@/lib/dates";

export type BudgetType = "rolling" | "advanced";

export type Settings = {
  decimal_places: number;
  budget_type: BudgetType;
  timezone: string;
};

// RLS ("own rows") already restricts this to the signed-in user's own
// settings row, so no explicit user id/auth.getUser() call is needed here —
// that would just be a second, redundant Auth-server round trip on top of
// the one the SSR middleware already made for this same request.
//
// Memoized per request: this is the most-called query in the app — the app
// layout needs `timezone`, every page needs `decimal_places`, and
// getBudgetData/getDashboardData each need the timezone again to decide what
// "this month" is. That was three identical round trips per page load.
export const getSettings = cache(async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("decimal_places, budget_type, timezone")
    .maybeSingle();
  if (error) throw new Error(error.message);

  // handle_new_user provisions exactly one settings row per account, so a
  // missing row means provisioning failed rather than "new user with
  // defaults". Silently substituting defaults here hid that; every read of
  // budget_type in particular would then disagree with what the database
  // functions compute.
  if (!data) {
    throw new Error(
      "No settings row for this account. Signup provisioning did not complete.",
    );
  }

  return {
    decimal_places: data.decimal_places,
    budget_type: data.budget_type === "rolling" ? "rolling" : "advanced",
    timezone: data.timezone ?? DEFAULT_TIME_ZONE,
  };
});
