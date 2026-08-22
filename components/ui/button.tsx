import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary";
type ButtonTone = "default" | "negative";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-surface hover:bg-foreground/90 hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0 active:scale-[0.98]",
  secondary:
    "border border-border bg-transparent hover:bg-background hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0 active:scale-[0.98]",
  tertiary: "px-0 py-0 h-auto hover:underline underline-offset-4",
};

const TONE_CLASSES: Record<ButtonTone, string> = {
  default: "",
  negative: "text-negative",
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
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-all duration-150",
        variant !== "tertiary" && SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
