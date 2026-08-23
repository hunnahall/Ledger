"use client";

import { stepAmountByDollar } from "@/lib/dollar-step";

// A plain <input type="number"> can't take an onKeyDown handler from a
// Server Component (event handlers can't cross that boundary) — this
// wraps it in a Client Component so server-rendered pages can still get
// the whole-dollar arrow-key stepping (see stepAmountByDollar).
export function DollarInput({
  name,
  defaultValue,
  min,
  required,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: number | string;
  min?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      name={name}
      step="0.01"
      min={min}
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue}
      onKeyDown={stepAmountByDollar}
      className={className}
    />
  );
}
