"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";

// Every failure path below redirects with a fixed code rather than
// Supabase's own message. See lib/auth/messages.ts for why.

async function siteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately one code for every failure — a wrong password, an unknown
  // address and an unconfirmed account must be indistinguishable, or the
  // login form becomes an account-enumeration oracle.
  if (error) redirect("/login?error=invalid_credentials");

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) redirect("/signup?error=password_too_short");
  if (password !== confirmPassword) redirect("/signup?error=password_mismatch");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });

  // Covers both "already registered" and the invite-only rejection raised by
  // the handle_new_user trigger — same code for both, again so this can't be
  // used to test which addresses exist or which are invited.
  if (error) redirect("/signup?error=signup_unavailable");

  redirect("/login?notice=check_email");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });

  // Result deliberately ignored: the confirmation is identical whether or
  // not an account exists.
  redirect("/login?notice=check_email_reset");
}

// Reached from /reset-password, where the recovery link has already been
// exchanged for a session by /auth/callback.
export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) redirect("/reset-password?error=password_too_short");
  if (password !== confirmPassword) redirect("/reset-password?error=password_mismatch");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=reset_link_invalid");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=password_rejected");

  await supabase.auth.signOut();
  redirect("/login?notice=password_updated");
}

// The signed-in equivalent, from Settings.
export async function changePassword(
  _prevState: { error: string } | { notice: string } | null,
  formData: FormData,
): Promise<{ error: string } | { notice: string }> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirmPassword) return { error: "The two passwords don't match." };

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "That password can't be used. Try a longer or less common one." };

  return { notice: "Password updated." };
}

export async function deleteAccount(): Promise<{ error: string } | null> {
  const { supabase } = await requireUser();

  // Scoped to auth.uid() inside the function; cascades every public.* row.
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/login");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
