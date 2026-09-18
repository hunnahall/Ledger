import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { authMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { AuthField, AuthMessages } from "@/app/(auth)/_field";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={signUp} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Sign up</h1>
      <p className="text-sm text-muted">
        Ledger is invite only — use the address your invite was sent to.
      </p>
      <AuthMessages error={authMessage(error)} notice={null} />
      <AuthField label="Email" name="email" type="email" autoComplete="email" />
      <AuthField
        label={`Password (${MIN_PASSWORD_LENGTH}+ characters)`}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
      />
      <AuthField
        label="Confirm password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
      />
      <Button type="submit" variant="primary">
        Sign up
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
