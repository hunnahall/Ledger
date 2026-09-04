import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE } from "@/lib/dates";

export type Settings = {
  decimal_places: number;
  month_ahead: boolean;
  timezone: string;
};

// RLS ("own rows") already restricts this to the signed-in user's own
// settings row, so no explicit user id/auth.getUser() call is needed here —
// that would just be a second, redundant Auth-server round trip on top of
// the one the SSR middleware already made for this same request.
export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("decimal_places, month_ahead, timezone")
    .maybeSingle();
  if (error) throw new Error(error.message);

  // handle_new_user provisions exactly one settings row per account, so a
  // missing row means provisioning failed rather than "new user with
  // defaults". Silently substituting defaults here hid that; every read of
  // month_ahead in particular would then disagree with what the database
  // functions compute.
  if (!data) {
    throw new Error(
      "No settings row for this account. Signup provisioning did not complete.",
    );
  }

  return {
    decimal_places: data.decimal_places,
    month_ahead: data.month_ahead,
    timezone: data.timezone ?? DEFAULT_TIME_ZONE,
  };
}
