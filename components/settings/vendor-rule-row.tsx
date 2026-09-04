"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { SpinnerIcon } from "@/components/ui/icons";
import { INCOME_RULE_TARGET } from "@/lib/transactions/vendor-rule-target";
import { useInlineEdit } from "@/components/ui/inline-edit";
import { FIELD_BASE, Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type ActionResult = { error: string } | null;
type UpdateRuleAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
type DeleteRuleAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

// Toggle-to-inline-edit, same underlying state machine as
// BalanceEditControl (see useInlineEdit), but with two fields (pattern +
// category) so it needs an explicit Save rather than committing on blur —
// tabbing from the text input into the category select would otherwise
// fire a premature save.
export function VendorRuleRow({
  rule,
  categories,
  updateAction,
  deleteAction,
}: {
  rule: {
    id: string;
    merchantNormalized: string;
    categoryId: string | null;
    isIncome: boolean;
    categoryName: string;
    useCount: number;
  };
  categories: { id: string; name: string }[];
  updateAction: UpdateRuleAction;
  deleteAction: DeleteRuleAction;
}) {
  const { editing, setEditing, isPending, error, commit, cancel } = useInlineEdit(updateAction);
  const merchantRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  function handleSave() {
    const formData = new FormData();
    formData.set("merchant", merchantRef.current?.value ?? "");
    formData.set("category_id", categoryRef.current?.value ?? "");
    commit(formData);
  }

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <span className="text-muted">If</span>
        <Input
          uiSize="sm"
          ref={merchantRef}
          type="text"
          defaultValue={rule.merchantNormalized}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          className="w-40"
        />
        <span className="text-muted">then</span>
        <select
          ref={categoryRef}
          defaultValue={rule.isIncome ? INCOME_RULE_TARGET : (rule.categoryId ?? "")}
          className={cn(FIELD_BASE, "px-2 py-1 text-xs")}
        >
          <option value={INCOME_RULE_TARGET}>Income</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="px-2 py-1 text-xs"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? <SpinnerIcon className="animate-spin" /> : null}
          Save
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="px-2 py-1 text-xs"
          onClick={cancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        {error && <p className="w-full text-xs text-negative">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <span>
        If <span className="font-medium">{rule.merchantNormalized}</span>, then{" "}
        <span className="font-medium">{rule.categoryName}</span>
        <span className="ml-2 text-xs text-muted">used {rule.useCount}&times;</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="px-2 py-1 text-xs"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <ActionButtonForm action={deleteAction} size="sm" tone="negative">
          Delete
        </ActionButtonForm>
      </div>
    </li>
  );
}
