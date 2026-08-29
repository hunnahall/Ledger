"use client";

import { useActionState, useEffect, useRef } from "react";
import { createVendorRule } from "@/lib/actions/vendor-rules";
import { INCOME_RULE_TARGET } from "@/lib/transactions/vendor-rule-target";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function CreateVendorRuleForm({
  categories,
  onDone,
}: {
  categories: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(createVendorRule, null);
  const submittedRef = useRef(false);

  // useActionState's `state` is `null` both before the first submit and
  // after a successful one — indistinguishable on its own — so only treat
  // a null state as "done" once a submit has actually happened.
  useEffect(() => {
    if (submittedRef.current && state === null) {
      submittedRef.current = false;
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        submittedRef.current = true;
      }}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-muted">
        If description contains
        <input
          type="text"
          name="merchant"
          required
          placeholder="e.g. Trader Joe's"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Then category is
        <Select name="category_id" required uiSize="sm" className="w-40" placeholder="Choose a category">
          <option value="">Choose a category</option>
          <option value={INCOME_RULE_TARGET}>Income</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" variant="accent" size="sm">
        Add rule
      </Button>
      {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
    </form>
  );
}
