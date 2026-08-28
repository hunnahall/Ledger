"use client";

import { useState, useTransition } from "react";

type ActionResult = { error: string } | null;
type InlineEditAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

// Shared state machine behind every "toggle button -> inline editor,
// commit via a server action, Escape/Cancel to back out" control in this
// app (BalanceEditControl, VendorRuleRow's edit branch). The editors
// themselves differ enough (field count, commit-on-blur vs. explicit Save)
// that only the editing/pending/error/commit orchestration is shared here
// — each caller still owns its own markup.
export function useInlineEdit(action: InlineEditAction) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function commit(formData: FormData) {
    startTransition(async () => {
      const result = await action(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  return { editing, setEditing, isPending, error, commit, cancel };
}
