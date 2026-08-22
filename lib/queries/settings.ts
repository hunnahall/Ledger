import { createClient } from "@/lib/supabase/server";

export async function getSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { decimal_places: 2 };

  const { data, error } = await supabase
    .from("settings")
    .select("decimal_places")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ?? { decimal_places: 2 };
}
