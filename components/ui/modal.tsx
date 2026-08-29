"use client";

import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders arbitrary content in a centered modal on demand. `open(node)`
 * shows it, `close()` (or clicking the overlay) hides it. Same overlay/
 * panel styling as useConfirm (components/ui/confirm-dialog.tsx) for visual
 * consistency, but generalized to hold any content instead of a fixed
 * Yes/No message — wider and scrollable since callers here (a transaction
 * list, a form) need more room than a confirmation prompt.
 */
export function useModal() {
  const [content, setContent] = useState<ReactNode | null>(null);

  const open = useCallback((node: ReactNode) => setContent(node), []);
  const close = useCallback(() => setContent(null), []);

  const modal = content
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-card-border bg-surface p-5 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>,
        document.body,
      )
    : null;

  return { open, close, modal };
}
