"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Renders a Yes/No confirmation modal on demand. `confirm(message)` resolves
 * once the user answers — await it inline in a submit handler to gate an
 * action on their response. Render the returned `dialog` node anywhere in
 * the component tree.
 */
export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((text: string) => {
    setMessage(text);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function respond(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setMessage(null);
  }

  const dialog = message
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => respond(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-card-border bg-surface p-5 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm">{message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" onClick={() => respond(false)}>
                No
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => respond(true)}>
                Yes
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return { confirm, dialog };
}
