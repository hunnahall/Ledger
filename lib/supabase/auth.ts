import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// auth.getUser() is a network round trip to the Supabase Auth server, not a
// local token decode — and one page render can make several (the Dashboard
// reaches it twice: ensureBudgetCurrent and getBudgetRateData). Who the
// caller is can't change part-way through a request, so React's cache()
// collapses them into a single round trip. Memoizing the lookup rather than
// requireUser itself keeps redirect()'s control-flow throw out of the cached
// value.
const getCachedUser = cache(async function getCachedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

// The createClient -> getUser -> redirect prelude was repeated verbatim in
// 30-odd server actions and queries. Collapsing it here is not only less
// code: several actions had skipped the check entirely and, because RLS
// silently filters an unauthenticated write down to zero rows, returned
// `null` — success — while doing nothing at all.
export async function requireUser() {
  const { supabase, user } = await getCachedUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// For read paths that render an empty/absent state rather than bouncing to
// the login page (the proxy already redirects unauthenticated navigations,
// so reaching these with no user means something unusual).
export async function getOptionalUser() {
  return getCachedUser();
}
