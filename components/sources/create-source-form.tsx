"use client";

import { useActionState, useState } from "react";
import { createSource } from "@/lib/actions/sources";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  CREATABLE_SOURCE_TYPES,
  SOURCE_TYPE_LABELS as TYPE_LABELS,
} from "@/lib/sources/validate-source";
import { Input } from "@/components/ui/input";
import { AddIcon } from "@/components/ui/icons";
import { useModal } from "@/components/ui/modal";


// The "Add source" dialog's form. Closes itself once the create succeeds.
export function CreateSourceForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState("reimbursement");
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string } | null, formData: FormData) => {
      const result = await createSource(prev, formData);
      if (!result?.error) onDone();
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Add Source</h2>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <Input
          type="text"
          name="name"
          required
          placeholder="e.g. Travel"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <Select name="type" value={type} onChange={setType}>
          {/* Only the two types a user can create — the rest are
              auto-provisioned singletons (createSource rejects them). */}
          {CREATABLE_SOURCE_TYPES.map((value) => (
            <option key={value} value={value}>
              {TYPE_LABELS[value]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Balance
        <Input
          type="number"
          name="balance"
          step="0.01"
          onKeyDown={stepAmountByDollar}
          defaultValue={0}
        />
      </label>

      {type === "reimbursement" && (
        <label className="flex flex-col gap-1 text-sm">
          Deposit date
          <Input
            type="date"
            name="deposit_date"
            required
          />
        </label>
      )}

      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Adding" : "Add source"}
        </Button>
      </div>
    </form>
  );
}

export function AddSourceButton() {
  const { open, close, modal } = useModal();
  return (
    <>
      <Button type="button" variant="accent" onClick={() => open(<CreateSourceForm onDone={close} />)}>
        <AddIcon size={16} />
        Add source
      </Button>
      {modal}
    </>
  );
}
