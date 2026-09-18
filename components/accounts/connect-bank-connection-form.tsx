"use client";

import { useActionState } from "react";
import { connectBankConnection } from "@/lib/actions/simplefin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConnectBankConnectionForm() {
  const [state, formAction] = useActionState(connectBankConnection, null);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
    >
      <label className="flex flex-1 min-w-64 flex-col gap-1 text-sm">
        SimpleFin setup token
        <Input
          type="text"
          name="setup_token"
          required
          placeholder="Paste the setup token from your SimpleFin Bridge account"
        />
      </label>
      <Button type="submit" variant="accent">
        Connect
      </Button>
      {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
    </form>
  );
}
