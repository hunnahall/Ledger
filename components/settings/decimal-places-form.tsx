"use client";

import { useActionState } from "react";
import { updateDecimalPlaces } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DecimalPlacesForm({ decimalPlaces }: { decimalPlaces: number }) {
  const [state, formAction, pending] = useActionState(updateDecimalPlaces, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Select name="decimal_places" defaultValue={decimalPlaces} className="w-28" uiSize="sm">
          <option value={0}>$1</option>
          <option value={2}>$1.50</option>
        </Select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
