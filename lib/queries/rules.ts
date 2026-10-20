import { createClient } from "@/lib/supabase/server";

export async function getRules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rules")
    .select(
      "id, merchant_normalized, category_id, source_id, is_income, is_exclude, use_count, last_used_at, categories(name), sources(name)",
    )
    .order("last_used_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
