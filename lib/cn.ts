import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// twMerge (not bare clsx) so a `className` prop can override a component's own
// base classes — without it, `<Button className="bg-surface">` loses to the
// variant's `bg-foreground` and call sites need `!` overrides to win.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
