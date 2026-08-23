import { createClient } from "@/lib/supabase/server";

const LOG_LIMIT = 200;

export async function getActivityLog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LOG_LIMIT);
  if (error) throw new Error(error.message);
  return data ?? [];
}
