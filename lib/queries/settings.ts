import { createClient } from "@/lib/supabase/server";

// RLS ("own rows") already restricts this to the signed-in user's own
// settings row, so no explicit user id/auth.getUser() call is needed here —
// that would just be a second, redundant Auth-server round trip on top of
// the one the SSR middleware already made for this same request.
export async function getSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("decimal_places, month_ahead")
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ?? { decimal_places: 2, month_ahead: true };
}
