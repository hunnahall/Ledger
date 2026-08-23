import type { KeyboardEvent } from "react";

// Native number inputs step by their `step` attribute, which on these
// fields is 0.01 so a typed amount like 42.50 stays valid — but that makes
// the Up/Down arrow keys crawl by a penny at a time, which is unusable for
// dollar amounts. Setting step to a whole number instead would fix the
// arrows but break submitting any typed cents (confirmed: a number input
// with step="1" reports a typed "42.50" as invalid and blocks form
// submission). So this intercepts only the arrow keys and steps by a whole
// dollar directly, leaving the step/validation behavior for typed or
// pasted values untouched.
export function stepAmountByDollar(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault();
  const input = e.currentTarget;
  const current = Number(input.value) || 0;
  let next = Math.round((current + (e.key === "ArrowUp" ? 1 : -1)) * 100) / 100;
  if (input.min !== "") next = Math.max(next, Number(input.min));
  if (input.max !== "") next = Math.min(next, Number(input.max));
  input.value = String(next);
}
