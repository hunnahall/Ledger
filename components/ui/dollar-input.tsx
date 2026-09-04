"use client";

import { stepAmountByDollar } from "@/lib/dollar-step";
import { Input, type FieldSize } from "@/components/ui/input";

// A plain <input type="number"> can't take an onKeyDown handler from a
// Server Component (event handlers can't cross that boundary) — this
// wraps it in a Client Component so server-rendered pages can still get
// the whole-dollar arrow-key stepping (see stepAmountByDollar). Composes
// Input rather than taking bare styling from callers, so it picks up the
// same hover/focus/disabled states as every other field.
export function DollarInput({
  name,
  defaultValue,
  min,
  required,
  placeholder,
  uiSize,
  className,
}: {
  name: string;
  defaultValue?: number | string;
  min?: string;
  required?: boolean;
  placeholder?: string;
  uiSize?: FieldSize;
  className?: string;
}) {
  return (
    <Input
      type="number"
      name={name}
      step="0.01"
      min={min}
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue}
      onKeyDown={stepAmountByDollar}
      uiSize={uiSize}
      className={className}
    />
  );
}
