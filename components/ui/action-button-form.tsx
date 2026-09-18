"use client";

import { useActionState } from "react";
import { Button, type ButtonProps } from "./button";
import { SpinnerIcon } from "./icons";

type SimpleAction = (
  prevState: { error: string } | null,
  formData: FormData,
) => Promise<{ error: string } | null>;

// The single-button-bound-to-one-action shape (archive this, delete that,
// sync this connection) shows up all over — this wraps useActionState once
// so each call site doesn't need to. Returning { error } instead of
// throwing (see the action itself) is what actually fixes the crash; this
// component is just where that gets displayed.
export function ActionButtonForm({
  action,
  children,
  errorClassName,
  ...buttonProps
}: ButtonProps & {
  action: SimpleAction;
  errorClassName?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction}>
      <Button {...buttonProps} type="submit" disabled={isPending || buttonProps.disabled}>
        {isPending ? <SpinnerIcon className="animate-spin" /> : null}
        {children}
      </Button>
      {state?.error && (
        <p className={errorClassName ?? "mt-1 text-xs text-negative"}>{state.error}</p>
      )}
    </form>
  );
}
