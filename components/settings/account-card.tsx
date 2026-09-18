"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, deleteAccount, signOut } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useModal } from "@/components/ui/modal";

const DELETE_CONFIRMATION = "DELETE";

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState(changePassword, null);

  return (
    <div>
      <p className="font-medium">Change password</p>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          New password ({MIN_PASSWORD_LENGTH}+ characters)
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm new password
          <Input
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="accent" size="sm">
            Change password
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onDone}>
            Cancel
          </Button>
        </div>
        {state && "error" in state && <p className="text-sm text-negative">{state.error}</p>}
        {state && "notice" in state && <p className="text-sm text-positive">{state.notice}</p>}
      </form>
    </div>
  );
}

// Deleting an account removes every transaction, source, rule and forecast
// with no undo, so it asks for a typed "DELETE" rather than a single confirm
// click.
function DeleteAccount() {
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
        Type <span className="font-medium">{DELETE_CONFIRMATION}</span> to confirm
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          tone="negative"
          size="sm"
          disabled={pending || typed.trim() !== DELETE_CONFIRMATION}
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
  const { open, close, modal } = useModal();

  return (
    <Card className="p-5">
      <p className="font-medium">Account</p>
      <p className="mt-1 text-sm text-muted">Signed in as {email}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => open(<ChangePasswordForm onDone={close} />)}
        >
          Change password
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            Log out
          </Button>
        </form>
        <DeleteAccount />
      </div>

      {modal}
    </Card>
  );
}
