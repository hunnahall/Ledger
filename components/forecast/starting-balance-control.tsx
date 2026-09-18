"use client";

import { useRef, type KeyboardEvent } from "react";
import { updateStartingBalanceOverride } from "@/lib/actions/forecasts";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { formatMoney } from "@/lib/format";
import { useInlineEdit } from "@/components/ui/inline-edit";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Input } from "@/components/ui/input";

// Same toggle-to-inline-input shape as MonthlyTransferControl, but always
// rendered (unlike that control, which only appears when there's no live
// source_transfers row) — the Source's live balance is always available as
// a fallback, so clearing the field reverts to it rather than requiring a
// value.
export function StartingBalanceControl({
  forecastId,
  override,
  liveBalance,
  decimalPlaces,
}: {
  forecastId: string;
  override: number | null;
  liveBalance: number;
  decimalPlaces: number;
}) {
  const { editing, setEditing, error, commit, cancel } = useInlineEdit(
    updateStartingBalanceOverride.bind(null, forecastId),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const effective = override ?? liveBalance;

  function commitIfChanged() {
    const value = inputRef.current?.value ?? "";
    if (Number(value || 0) === effective) {
      cancel();
      return;
    }
    const formData = new FormData();
    formData.set("starting_balance_override", value);
    commit(formData);
  }

  function resetToLive() {
    if (override === null) {
      cancel();
      return;
    }
    const formData = new FormData();
    formData.set("starting_balance_override", "");
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
          Starting balance{override !== null ? " (custom)" : ""}:{" "}
          <Money amount={effective} decimalPlaces={decimalPlaces} />
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
        defaultValue={effective}
        autoFocus
        onBlur={commitIfChanged}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-28"
      />
      {override !== null && (
        <button type="button" onClick={resetToLive} className="text-xs text-muted hover:underline">
          Reset to live ({formatMoney(liveBalance, decimalPlaces)})
        </button>
      )}
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
