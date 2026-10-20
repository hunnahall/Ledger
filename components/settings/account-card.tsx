"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, deleteAccount, signOut } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useModal } from "@/components/ui/modal";
import { SettingRow } from "@/components/settings/setting-row";

const DELETE_CONFIRMATION = "DELETE";

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState(changePassword, null);

  return (
    <div>
      <h2 className="text-xl font-semibold">Change Password</h2>
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
        {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
        {state && "notice" in state && <p className="text-sm text-foreground-secondary">{state.notice}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" onClick={onDone}>
            {state && "notice" in state ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Change password
          </Button>
        </div>
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
      <Button type="button" tone="negative" size="sm" onClick={() => setOpen(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <p className="text-sm text-danger">
        This permanently deletes your account and everything in it: transactions, sources,
        categories, rules and forecasts. It can&apos;t be undone.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Type <span className="font-medium">{DELETE_CONFIRMATION}</span> to confirm
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button
          type="button"
          tone="danger"
          size="sm"
          disabled={pending || typed.trim() !== DELETE_CONFIRMATION}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteAccount();
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Deleting" : "Delete permanently"}
        </Button>
        <Button type="button" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// The Settings page's Account panel: who's signed in, password, log out, and
// account deletion.
export function AccountCard({ email }: { email: string }) {
  const { open, close, modal } = useModal();

  return (
    <Card title="Account">
      <SettingRow label="Email" description="The address you sign in with.">
        <span className="font-mono text-sm text-foreground-secondary">{email}</span>
      </SettingRow>
      <SettingRow label="Password">
        <Button type="button" size="sm" onClick={() => open(<ChangePasswordForm onDone={close} />)}>
          Change password
        </Button>
      </SettingRow>
      <SettingRow label="Log out" description="Sign out on this device.">
        <form action={signOut}>
          <Button type="submit" size="sm">
            Log out
          </Button>
        </form>
      </SettingRow>
      <SettingRow label="Delete account" description="Removes your account and all of its data.">
        <DeleteAccount />
      </SettingRow>
      {modal}
    </Card>
  );
}
