"use client";

import { useActionState, useState } from "react";

type Result = { error: string } | null;

// An inline "add" form that stays open, with its error, until the save
// succeeds. Closing it on submit (as these forms used to) dropped the error
// along with whatever the user had typed.
export function useAddForm(action: (prev: Result, formData: FormData) => Promise<Result>) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: Result, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result?.error) setOpen(false);
    return result;
  }, null);
  return { open, setOpen, error: open ? (state?.error ?? null) : null, formAction, pending };
}
