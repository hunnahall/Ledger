import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { authMessage, authNotice } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { AuthField, AuthMessages } from "@/app/(auth)/_field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <form action={signIn} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      <AuthMessages error={authMessage(error)} notice={authNotice(notice)} />
      <AuthField label="Email" name="email" type="email" autoComplete="email" />
      <AuthField label="Password" name="password" type="password" autoComplete="current-password" />
      <Button type="submit" variant="primary">
        Log in
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href="/forgot-password" className="text-foreground underline">
          Forgot your password?
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        Have an invite?{" "}
        <Link href="/signup" className="text-foreground underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
