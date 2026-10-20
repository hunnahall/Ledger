"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRule } from "@/lib/actions/rules";
import {
  EXCLUDE_RULE_TARGET,
  INCOME_RULE_TARGET,
  SOURCE_RULE_TARGET_PREFIX,
} from "@/lib/transactions/rule-target";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function CreateRuleForm({
  categories,
  sources,
  onDone,
}: {
  categories: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(createRule, null);
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
      className="mb-4 flex flex-wrap items-end gap-3 border border-dashed border-border p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-muted">
        If description contains
        <Input
          type="text"
          name="merchant"
          required
          placeholder="e.g. Trader Joe's"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Then set
        <Select name="category_id" required uiSize="sm" className="w-40" placeholder="Choose a target">
          <option value="">Choose a target</option>
          <option value={INCOME_RULE_TARGET}>Income</option>
          <option value={EXCLUDE_RULE_TARGET}>Excluded</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {sources.map((s) => (
            <option key={s.id} value={SOURCE_RULE_TARGET_PREFIX + s.id}>
              Source: {s.name}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" variant="accent" size="sm">
        Add rule
      </Button>
      {state?.error && <p className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}
