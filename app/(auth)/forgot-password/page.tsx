import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { authMessage } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { AuthField, AuthMessages } from "@/app/(auth)/_field";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={requestPasswordReset} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="text-sm text-muted">
        We&apos;ll email you a link to set a new one.
      </p>
      <AuthMessages error={authMessage(error)} notice={null} />
      <AuthField label="Email" name="email" type="email" autoComplete="email" />
      <Button type="submit" variant="primary">
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-foreground underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
