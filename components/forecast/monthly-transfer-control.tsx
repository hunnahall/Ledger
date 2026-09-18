"use client";

import { useRef, type KeyboardEvent } from "react";
import { updateMonthlyTransferOverride } from "@/lib/actions/forecasts";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { useInlineEdit } from "@/components/ui/inline-edit";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Input } from "@/components/ui/input";

// Only rendered when the chosen Source has no real Source Transfer on the
// Budgets page (see ForecastView) — this value is forecast-local (see
// updateMonthlyTransferOverride) and never written back to
// source_transfers. Same toggle-to-inline-input shape as
// BalanceEditControl (components/sources/balance-edit-control.tsx).
export function MonthlyTransferControl({
  forecastId,
  amount,
  decimalPlaces,
}: {
  forecastId: string;
  amount: number | null;
  decimalPlaces: number;
}) {
  const { editing, setEditing, error, commit, cancel } = useInlineEdit(
    updateMonthlyTransferOverride.bind(null, forecastId),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function commitIfChanged() {
    const value = inputRef.current?.value ?? "";
    if (Number(value || 0) === (amount ?? 0)) {
      cancel();
      return;
    }
    const formData = new FormData();
    formData.set("monthly_transfer_override", value);
    commit(formData);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    stepAmountByDollar(event);
    if (event.key === "Enter") {
      event.preventDefault();
      commitIfChanged();
    } else if (event.key === "Escape") {
      cancel();
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">
          Monthly transfer (assumed): <Money amount={amount ?? 0} decimalPlaces={decimalPlaces} />
          /mo
        </span>
        <Button type="button" variant="secondary" size="sm" className="px-2 py-1 text-xs" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        defaultValue={amount ?? 0}
        autoFocus
        onBlur={commitIfChanged}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-28"
      />
      <span className="text-sm text-muted">/mo</span>
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
