"use client";

import { useActionState } from "react";
import { createFund } from "@/lib/actions/sources";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarInput } from "@/components/ui/dollar-input";

export function CreateFundForm() {
  const [state, formAction] = useActionState(createFund, null);

  return (
    <Card className="max-w-lg p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          New fund name
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Travel Fund"
            className="w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Balance
          <DollarInput
            name="balance"
            defaultValue={0}
            className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <Button type="submit" variant="accent">
          Create
        </Button>
        {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
      </form>
    </Card>
  );
}
