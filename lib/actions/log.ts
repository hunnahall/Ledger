import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Records one changed field to the activity_log for the "manual admin
// change" pages (Budgets/Sources/Accounts) — Transactions has its own
// record in the transaction row, so nothing there calls this. Called
// inline from the mutating action after it succeeds, the same way
// learnVendorRule is (lib/actions/transactions.ts) — an already-created
// client + userId passed in, not its own "use server" action.
export async function logChange(
  supabase: SupabaseServerClient,
  userId: string,
  page: string,
  variable: string,
  oldValue: string | null,
  newValue: string | null,
) {
  const { error } = await supabase.from("activity_log").insert({
    user_id: userId,
    page,
    variable,
    old_value: oldValue,
    new_value: newValue,
  });
  // A failed log write shouldn't fail the actual change it's recording —
  // surface it server-side and move on.
  if (error) console.error("logChange failed:", error.message);
}
