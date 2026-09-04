import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "accent";
type ButtonTone = "default" | "negative";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
}

// Hover and press are carried by colour and elevation, never by movement — a
// button that lifts off the page draws the eye to the chrome instead of to
// what changed.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-surface shadow-xs hover:bg-paper-11 active:bg-paper-10",
  secondary:
    "border border-border bg-surface shadow-xs hover:border-border-strong hover:bg-paper-a1 active:bg-paper-a2",
  tertiary: "px-0 py-0 h-auto hover:underline underline-offset-4",
  accent:
    "bg-mark text-mark-foreground shadow-xs hover:brightness-[0.96] active:brightness-[0.92]",
};

// A destructive action reads as destructive on its own surface, not only in
// its label — so the border and fill move with the text.
const TONE_CLASSES: Record<ButtonTone, string> = {
  default: "",
  negative:
    "text-negative border-negative/30 hover:border-negative/50 hover:bg-negative/8 active:bg-negative/12",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5",
  md: "px-3 py-2",
  icon: "p-2",
};

export function Button({
  variant = "secondary",
  tone = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium",
        "transition-[background-color,border-color,box-shadow,color,filter] duration-[120ms] ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        "disabled:pointer-events-none disabled:opacity-60",
        variant !== "tertiary" && SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
