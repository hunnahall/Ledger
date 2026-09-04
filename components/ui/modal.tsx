"use client";

import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DialogShell } from "@/components/ui/dialog-shell";

/**
 * Renders arbitrary content in a centered modal on demand. `open(node)`
 * shows it, `close()` (or clicking the overlay, or Escape) hides it. Shares
 * DialogShell with useConfirm (components/ui/confirm-dialog.tsx), so the two
 * stay identical; this one is just wider and scrollable, since callers here
 * (a transaction list, a form) need more room than a confirmation prompt.
 */
export function useModal() {
  const [content, setContent] = useState<ReactNode | null>(null);

  const open = useCallback((node: ReactNode) => setContent(node), []);
  const close = useCallback(() => setContent(null), []);

  const modal = content
    ? createPortal(
        <DialogShell
          role="dialog"
          panelClassName="w-full max-w-lg max-h-[85vh] overflow-y-auto"
          onDismiss={close}
        >
          {content}
        </DialogShell>,
        document.body,
      )
    : null;

  return { open, close, modal };
}
