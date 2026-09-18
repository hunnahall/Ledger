import { updatePassword } from "@/lib/actions/auth";
import { authMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { AuthField, AuthMessages } from "@/app/(auth)/_field";

// Reached only after /auth/callback has exchanged the emailed recovery code
// for a session, so the user is technically signed in at this point — the
// proxy's "signed-in users don't see auth pages" redirect explicitly
// exempts this route.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={updatePassword} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Set a new password</h1>
      <AuthMessages error={authMessage(error)} notice={null} />
      <AuthField
        label={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
      />
      <AuthField
        label="Confirm new password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
      />
      <Button type="submit" variant="primary">
        Update password
      </Button>
    </form>
  );
}
