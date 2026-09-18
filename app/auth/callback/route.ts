import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where Supabase sends the user back after an email confirmation or a
// password-reset link. Exchanges the one-time code for a session cookie,
// then forwards to wherever the link asked for.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Only same-site relative paths — `next` comes off the URL, so an
  // absolute one would turn this into an open redirect.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
