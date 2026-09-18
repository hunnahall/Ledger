"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";

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
        <DialogShell
          role="alertdialog"
          panelClassName="w-full max-w-sm"
          onDismiss={() => respond(false)}
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
        </DialogShell>,
        document.body,
      )
    : null;

  return { confirm, dialog };
}
