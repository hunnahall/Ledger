// Auth results are reported as codes rather than by echoing Supabase's own
// error text into a query string. Two reasons: "User already registered"
// told anyone with the signup form which addresses have accounts, and a
// free-text ?error= let anyone hand out a link that renders arbitrary text
// on our login page.
export const AUTH_MESSAGES = {
  invalid_credentials: "That email and password don't match an account.",
  signup_unavailable:
    "That address can't be signed up right now. Ledger is invite only — check the address on your invite.",
  password_too_short: "Use a password of at least 10 characters.",
  password_mismatch: "The two passwords don't match.",
  password_rejected: "That password can't be used. Try a longer or less common one.",
  reset_link_invalid: "That reset link has expired or has already been used.",
  reset_failed: "Couldn't update the password. Request a new reset link and try again.",
  unavailable: "Something went wrong. Try again in a moment.",
} as const;

export type AuthMessageCode = keyof typeof AUTH_MESSAGES;

export const AUTH_NOTICES = {
  check_email: "Check your email to confirm your account.",
  check_email_reset: "If that address has an account, a password reset link is on its way.",
  password_updated: "Password updated. Log in with your new password.",
} as const;

export type AuthNoticeCode = keyof typeof AUTH_NOTICES;

export function authMessage(code: string | undefined): string | null {
  if (!code) return null;
  return AUTH_MESSAGES[code as AuthMessageCode] ?? AUTH_MESSAGES.unavailable;
}

export function authNotice(code: string | undefined): string | null {
  if (!code) return null;
  return AUTH_NOTICES[code as AuthNoticeCode] ?? null;
}

// Applied server-side in signUp, updatePassword and changePassword, so it
// holds regardless of what the form sends.
//
// This is the only real password gate on this project: Supabase's own
// leaked-password check (HaveIBeenPwned) is Pro-plan only and this project is
// on free, so the security advisor's warning about it will never clear.
export const MIN_PASSWORD_LENGTH = 10;
