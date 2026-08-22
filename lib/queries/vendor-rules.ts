import { createClient } from "@/lib/supabase/server";

export async function getVendorRules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_category_rules")
    .select("id, merchant_normalized, use_count, last_used_at, categories(name)")
    .order("last_used_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
