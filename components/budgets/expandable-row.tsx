"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AddIcon, ChevronDownIcon } from "@/components/ui/icons";

type ActionResult = { error: string } | null;
type RowAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

// Shared shape behind SinkingExpenseRow and SourceTransferRow: a compact
// row (name/summary + chevron + optional add button) with a hidden-not-
// unmounted detail row underneath holding the edit form. Kept unmounted
// would fight password-manager extensions that inject overlays into page
// inputs and lose track of them across a remount — only visibility
// toggles, same reasoning both rows used to carry independently.
export function ExpandableRow({
  compactCells,
  colSpan,
  isLast,
  addLabel,
  expandLabel,
  collapseLabel,
  onAddClick,
  updateAction,
  deleteAction,
  children,
}: {
  compactCells: ReactNode;
  colSpan: number;
  isLast: boolean;
  addLabel: string;
  expandLabel: string;
  collapseLabel: string;
  onAddClick: () => void;
  updateAction: RowAction;
  deleteAction: RowAction;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updateState, runUpdateAction] = useActionState(updateAction, null);
  const [deleteState, runDeleteAction] = useActionState(deleteAction, null);

  return (
    <>
      <tr className="border-b border-border align-middle transition-colors duration-[120ms] ease-standard last:border-0 hover:bg-paper-a1">
        {compactCells}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? collapseLabel : expandLabel}
              aria-expanded={expanded}
              className="rounded-sm p-1 text-muted transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 hover:text-foreground"
            >
              <ChevronDownIcon size={14} className={expanded ? "rotate-180" : ""} />
            </button>
            {isLast && (
              <Button
                type="button"
                variant="accent"
                size="icon"
                aria-label={addLabel}
                onClick={onAddClick}
              >
                <AddIcon />
              </Button>
            )}
          </div>
        </td>
      </tr>

      <tr className={`border-b border-border bg-surface-subtle last:border-0 ${expanded ? "" : "hidden"}`}>
        <td colSpan={colSpan} className="px-4 py-3">
          <form action={runUpdateAction} className="flex flex-wrap items-center gap-3">
            {children}
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button type="submit" size="sm" tone="negative" formAction={runDeleteAction}>
              Delete
            </Button>
            {(updateState?.error || deleteState?.error) && (
              <p className="w-full text-xs text-negative">
                {updateState?.error || deleteState?.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    </>
  );
}
