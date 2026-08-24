"use client";

import { useActionState } from "react";
import { updateDecimalPlaces } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DecimalPlacesForm({ decimalPlaces }: { decimalPlaces: number }) {
  const [state, formAction] = useActionState(updateDecimalPlaces, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Decimal places
        <Select name="decimal_places" defaultValue={decimalPlaces} className="w-full">
          <option value={0}>0 (e.g. $42)</option>
          <option value={1}>1 (e.g. $42.5)</option>
          <option value={2}>2 (e.g. $42.50)</option>
        </Select>
      </label>
      <p className="text-xs text-muted">
        This only affects display and manual-entry rounding. Amounts synced from your bank are
        always stored at full precision.
      </p>
      <Button type="submit" variant="accent" className="w-fit">
        Save
      </Button>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
