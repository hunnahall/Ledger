"use client";

import { useActionState } from "react";
import { connectBankConnection } from "@/lib/actions/simplefin";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useModal } from "@/components/ui/modal";

function ConnectBankConnectionForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string } | null, formData: FormData) => {
      const result = await connectBankConnection(prev, formData);
      if (!result?.error) onDone();
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Connect Bank</h2>
        <p className="mt-1 text-sm text-muted">
          Get a setup token from{" "}
          <a href="https://beta-bridge.simplefin.org/" target="_blank" rel="noreferrer" className="text-accent underline">
            your SimpleFin Bridge account
          </a>
          . A token can only be claimed once, and one connection can cover several accounts.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        SimpleFin setup token
        <Input type="text" name="setup_token" required autoFocus placeholder="Paste the setup token" />
      </label>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Connecting" : "Connect"}
        </Button>
      </div>
    </form>
  );
}

// The Accounts page's one accent button.
export function ConnectBankButton() {
  const { open, close, modal } = useModal();
  return (
    <>
      <Button type="button" variant="accent" onClick={() => open(<ConnectBankConnectionForm onDone={close} />)}>
        <AddIcon size={16} />
        Connect bank
      </Button>
      {modal}
    </>
  );
}
