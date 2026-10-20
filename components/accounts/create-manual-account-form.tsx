"use client";

import { useActionState } from "react";
import { createManualAccount } from "@/lib/actions/accounts";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DollarInput } from "@/components/ui/dollar-input";
import { AddIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useModal } from "@/components/ui/modal";
import { ACCOUNT_TYPE_LABELS as TYPE_LABELS } from "@/lib/accounts/types";

function CreateManualAccountForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string } | null, formData: FormData) => {
      const result = await createManualAccount(prev, formData);
      if (!result?.error) onDone();
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Add Account</h2>
      <label className="flex flex-col gap-1 text-sm">
        Account name
        <Input type="text" name="account_name" required autoFocus placeholder="e.g. Cash, Wallet" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <Select name="account_type" defaultValue="manual">
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Starting balance
        <DollarInput name="current_balance" defaultValue={0} />
      </label>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Adding" : "Add account"}
        </Button>
      </div>
    </form>
  );
}

export function AddManualAccountButton() {
  const { open, close, modal } = useModal();
  return (
    <>
      <Button type="button" size="sm" onClick={() => open(<CreateManualAccountForm onDone={close} />)}>
        <AddIcon size={16} />
        Add account
      </Button>
      {modal}
    </>
  );
}
