"use client";

import { useActionState } from "react";
import { createManualAccount } from "@/lib/actions/accounts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DollarInput } from "@/components/ui/dollar-input";
import { AddIcon } from "@/components/ui/icons";
import { ACCOUNT_TYPE_LABELS as TYPE_LABELS } from "@/lib/accounts/types";
import { Input } from "@/components/ui/input";


export function CreateManualAccountForm() {
  const [state, formAction] = useActionState(createManualAccount, null);

  return (
    <Card className="max-w-2xl p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Account name
          <Input
            type="text"
            name="account_name"
            required
            placeholder="e.g. Cash, Wallet"
            className="w-44"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <Select name="account_type" defaultValue="manual" className="w-36">
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Starting balance
          <DollarInput
            name="current_balance"
            defaultValue={0}
            className="w-28"
          />
        </label>
        <Button type="submit" variant="accent" size="icon" aria-label="Add account">
          <AddIcon />
        </Button>
        {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
      </form>
    </Card>
  );
}
