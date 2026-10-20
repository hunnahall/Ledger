"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/icons";

type ActionResult = { error: string } | null;
type RowAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

// Shared shape behind CategoryRow, SinkingExpenseRow and SourceTransferRow:
// a compact row (figures + chevron) with a hidden-not-
// unmounted detail row underneath holding the edit form. Kept unmounted
// would fight password-manager extensions that inject overlays into page
// inputs and lose track of them across a remount — only visibility
// toggles, same reasoning both rows used to carry independently.
export function ExpandableRow({
  compactCells,
  colSpan,
  expandLabel,
  collapseLabel,
  updateAction,
  deleteAction,
  children,
}: {
  compactCells: ReactNode;
  colSpan: number;
  expandLabel: string;
  collapseLabel: string;
  updateAction: RowAction;
  deleteAction: RowAction;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updateState, runUpdateAction] = useActionState(updateAction, null);
  const [deleteState, runDeleteAction] = useActionState(deleteAction, null);

  return (
    <>
      <tr
        onClick={() => setExpanded((e) => !e)}
        className="h-9 cursor-pointer border-b border-border align-middle transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
      >
        {compactCells}
        <td className="w-10 px-2">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((x) => !x);
              }}
              aria-label={expanded ? collapseLabel : expandLabel}
              aria-expanded={expanded}
              className="p-1 text-muted transition-colors duration-[120ms] ease-standard hover:bg-fill-active hover:text-foreground"
            >
              <ChevronDownIcon size={14} className={expanded ? "rotate-180" : ""} />
            </button>
          </div>
        </td>
      </tr>

      <tr className={`border-b border-border bg-surface-subtle ${expanded ? "" : "hidden"}`}>
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
              <p className="w-full text-xs text-danger">
                {updateState?.error || deleteState?.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    </>
  );
}
