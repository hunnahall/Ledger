"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The overlay + panel shared by useModal and useConfirm: one surface
 * treatment, one entrance, and the behaviour both were missing — Escape to
 * dismiss and a scroll lock so the page underneath stays put.
 */
export function DialogShell({
  role,
  panelClassName,
  onDismiss,
  children,
}: {
  role: "dialog" | "alertdialog";
  panelClassName: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // A Select open inside the panel handles its own Escape and calls
      // preventDefault; without this check that keypress would close the
      // dropdown and the dialog behind it in one go.
      if (event.key === "Escape" && !event.defaultPrevented) onDismiss();
    }
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      // The pre-open state is @starting-style (Tailwind's `starting:`), so
      // the entrance is pure CSS — no mount-and-flip state to keep in sync.
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 opacity-100 backdrop-blur-sm transition-opacity duration-[120ms] ease-entrance starting:opacity-0"
    >
      <div
        role={role}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "scale-100 rounded-xl border border-card-border bg-surface p-5 opacity-100 shadow-modal",
          "transition-[opacity,transform] duration-[120ms] ease-entrance starting:scale-[0.98] starting:opacity-0",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
