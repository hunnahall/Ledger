"use client";

import { useActionState, useState } from "react";
import { createSource } from "@/lib/actions/sources";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  CREATABLE_SOURCE_TYPES,
  SOURCE_TYPE_LABELS as TYPE_LABELS,
} from "@/lib/sources/validate-source";


export function CreateSourceForm() {
  const [type, setType] = useState("reimbursement");
  const [state, formAction] = useActionState(createSource, null);

  return (
    <Card className="max-w-3xl p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          New source name
          <input
            type="text"
            name="name"
            required
            placeholder="Reimbursement"
            className="w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <Select name="type" value={type} onChange={setType} className="w-40">
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
          <input
            type="number"
            name="balance"
            step="0.01"
            onKeyDown={stepAmountByDollar}
            defaultValue={0}
            className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        {type === "reimbursement" && (
          <label className="flex flex-col gap-1 text-sm">
            Deposit date
            <input
              type="date"
              name="deposit_date"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}

        <Button type="submit" variant="accent">
          Create
        </Button>
        {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
      </form>
    </Card>
  );
}
