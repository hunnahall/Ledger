import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// The createClient -> getUser -> redirect prelude was repeated verbatim in
// 30-odd server actions and queries. Collapsing it here is not only less
// code: several actions had skipped the check entirely and, because RLS
// silently filters an unauthenticated write down to zero rows, returned
// `null` — success — while doing nothing at all.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// For read paths that render an empty/absent state rather than bouncing to
// the login page (the proxy already redirects unauthenticated navigations,
// so reaching these with no user means something unusual).
export async function getOptionalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
