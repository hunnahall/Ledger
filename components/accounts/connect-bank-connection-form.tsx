"use client";

import { useActionState } from "react";
import { connectBankConnection } from "@/lib/actions/simplefin";
import { Button } from "@/components/ui/button";

export function ConnectBankConnectionForm() {
  const [state, formAction] = useActionState(connectBankConnection, null);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
    >
      <label className="flex flex-1 min-w-64 flex-col gap-1 text-sm">
        SimpleFin setup token
        <input
          type="text"
          name="setup_token"
          required
          placeholder="Paste the setup token from your SimpleFin Bridge account"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <Button type="submit" variant="accent">
        Connect
      </Button>
      {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
    </form>
  );
}
