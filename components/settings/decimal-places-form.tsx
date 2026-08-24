"use client";

import { useActionState } from "react";
import { updateDecimalPlaces } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DecimalPlacesForm({ decimalPlaces }: { decimalPlaces: number }) {
  const [state, formAction] = useActionState(updateDecimalPlaces, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Decimal places
          <Select name="decimal_places" defaultValue={decimalPlaces} className="w-40">
            <option value={0}>0 (e.g. $42)</option>
            <option value={1}>1 (e.g. $42.5)</option>
            <option value={2}>2 (e.g. $42.50)</option>
          </Select>
        </label>
        <Button type="submit" variant="accent" className="w-fit">
          Save
        </Button>
      </div>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
