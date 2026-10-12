import { createClient } from "@/lib/supabase/server";

export const LOG_PAGE_SIZE = 100;

// One page of the Log, newest first. `page` is 1-based; the total count
// comes back on the same request so the page can show "Page x of y".
export async function getActivityLog(page: number) {
  const supabase = await createClient();
  const from = (page - 1) * LOG_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + LOG_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    entries: data ?? [],
    totalPages: Math.max(1, Math.ceil(total / LOG_PAGE_SIZE)),
  };
}
