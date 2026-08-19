import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type FieldSize = "sm" | "md";

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: "px-2 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  uiSize?: FieldSize;
}

export function Input({ uiSize = "md", className, ...props }: InputProps) {
  return (
    <input
      className={cn("rounded-md border border-border bg-background", SIZE_CLASSES[uiSize], className)}
      {...props}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  uiSize?: FieldSize;
}

export function Select({ uiSize = "md", className, ...props }: SelectProps) {
  return (
    <select
      className={cn("rounded-md border border-border bg-background", SIZE_CLASSES[uiSize], className)}
      {...props}
    />
  );
}
