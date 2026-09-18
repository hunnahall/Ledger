import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Memoized per request (React.cache), not per call site. A single page render
// reaches this from the layout, the page, and every query/action helper below
// them — roughly a dozen times — and each call was building a fresh client and
// re-reading the cookie store. One client per request is also what lets
// getCachedUser (lib/supabase/auth.ts) hold a single auth.getUser() result.
// cache() is request-scoped, so nothing leaks between users.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component; ignore since middleware
            // refreshes the session on every request.
          }
        },
      },
    },
  );
});
