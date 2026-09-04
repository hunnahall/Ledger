"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, deleteAccount, signOut } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Deleting an account removes every transaction, source, rule and forecast
// with no undo, so it asks for the address to be typed rather than a single
// confirm click.
function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" tone="negative" size="sm" onClick={() => setOpen(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-negative">
        This permanently deletes your account and everything in it — transactions, sources,
        categories, rules and forecasts. It can&apos;t be undone.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Type <span className="font-medium">{email}</span> to confirm
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          tone="negative"
          size="sm"
          disabled={pending || typed.trim().toLowerCase() !== email.toLowerCase()}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteAccount();
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
    </div>
  );
}

export function AccountCard({ email }: { email: string }) {
  const [state, formAction] = useActionState(changePassword, null);

  return (
    <Card className="p-5">
      <p className="font-medium">Account</p>
      <p className="mt-1 text-sm text-muted">Signed in as {email}</p>

      <form action={formAction} className="mt-4 flex flex-col gap-3 sm:max-w-sm">
        <label className="flex flex-col gap-1 text-sm">
          New password ({MIN_PASSWORD_LENGTH}+ characters)
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm new password
          <input
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <Button type="submit" variant="accent" className="w-fit">
          Change password
        </Button>
        {state && "error" in state && <p className="text-sm text-negative">{state.error}</p>}
        {state && "notice" in state && <p className="text-sm text-positive">{state.notice}</p>}
      </form>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            Log out
          </Button>
        </form>
        <DeleteAccount email={email} />
      </div>
    </Card>
  );
}
