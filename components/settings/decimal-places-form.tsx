"use client";

import { useActionState } from "react";
import { updateDecimalPlaces } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DecimalPlacesForm({ decimalPlaces }: { decimalPlaces: number }) {
  const [state, formAction] = useActionState(updateDecimalPlaces, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-sm">
        Decimal places
        <div className="flex items-end gap-2">
          <Select name="decimal_places" defaultValue={decimalPlaces} className="w-32">
            <option value={0}>0 (e.g. $42)</option>
            <option value={1}>1 (e.g. $42.5)</option>
            <option value={2}>2 (e.g. $42.50)</option>
          </Select>
          <Button type="submit" variant="accent" className="w-fit shrink-0">
            Save
          </Button>
        </div>
      </div>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
