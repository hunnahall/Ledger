import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

export type FieldSize = "sm" | "md";

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: "h-[var(--control-sm)] px-2 text-xs",
  md: "h-[var(--control-md)] px-2.5 text-sm",
};

/** Shared by Input, the textarea below, and the Select trigger, so a field
 * looks and reacts the same whichever control is behind it. */
export const FIELD_BASE =
  // Deliberately no width: fields sit in flex rows with their own w-* classes,
  // and a default w-full would make each one claim the whole line.
  "border border-border-strong bg-surface text-foreground " +
  "transition-[border-color,box-shadow,background-color] duration-[120ms] ease-standard " +
  "placeholder:text-muted hover:border-muted " +
  "focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[inset_0_0_0_1px_var(--accent)] " +
  "disabled:cursor-not-allowed disabled:bg-fill-hover disabled:text-muted";

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
  return <textarea className={fieldClasses(uiSize, cn("h-auto py-1.5", className))} {...props} />;
}
