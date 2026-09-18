import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

export type FieldSize = "sm" | "md";

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-2.5 py-1.5 text-sm",
};

/** Shared by Input, the textarea below, and the Select trigger, so a field
 * looks and reacts the same whichever control is behind it. */
export const FIELD_BASE =
  // Deliberately no width: fields sit in flex rows with their own w-* classes,
  // and a default w-full would make each one claim the whole line.
  "rounded-md border border-border bg-surface text-foreground " +
  "transition-[border-color,box-shadow,background-color] duration-[120ms] ease-standard " +
  "placeholder:text-paper-7 hover:border-border-strong " +
  "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 " +
  "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-paper-7";

export function fieldClasses(uiSize: FieldSize = "md", className?: string) {
  return cn(FIELD_BASE, SIZE_CLASSES[uiSize], className);
}

// ComponentPropsWithRef (not InputHTMLAttributes) so callers that need the
// DOM node — the inline edit controls, which focus and select on mount — can
// pass `ref` straight through as the ordinary prop it is under React 19.
export interface InputProps extends Omit<ComponentPropsWithRef<"input">, "size"> {
  uiSize?: FieldSize;
}

export function Input({ uiSize = "md", className, ...props }: InputProps) {
  return <input className={fieldClasses(uiSize, className)} {...props} />;
}

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  uiSize?: FieldSize;
}

export function Textarea({ uiSize = "md", className, ...props }: TextareaProps) {
  return <textarea className={fieldClasses(uiSize, className)} {...props} />;
}
