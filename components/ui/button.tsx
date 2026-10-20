import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "accent";
type ButtonTone = "default" | "negative" | "danger";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
}

// Covenant Works v2 buttons. Primary is an ink fill; accent (Umber) is
// for the single most frequent action on a screen; secondary is a surface
// with a strong hairline. Press drops the button 1px, nothing scales.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-foreground text-[var(--on-fg)] hover:bg-foreground/85",
  secondary:
    "border border-border-strong bg-surface hover:border-muted hover:bg-fill-hover",
  tertiary: "h-auto px-0 text-foreground-secondary hover:text-foreground hover:underline underline-offset-4",
  accent: "border border-transparent bg-accent text-on-accent hover:bg-accent/85",
};

// Danger is outlined (`negative`) everywhere except inside a confirm step,
// the one place it fills red (`danger`).
const TONE_CLASSES: Record<ButtonTone, string> = {
  default: "",
  negative:
    "border-danger/50 bg-transparent text-danger hover:border-danger hover:bg-danger-soft",
  danger: "border-transparent bg-danger text-[var(--on-fg)] hover:bg-danger/85",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-[var(--control-sm)] px-2.5",
  md: "h-[var(--control-md)] px-3",
  icon: "size-[var(--control-md)] p-0",
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
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
        "transition-[background-color,border-color,color,transform] duration-[120ms] ease-standard",
        "active:translate-y-px",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        variant !== "tertiary" && SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
