import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";

type Column = ReactNode | { label: ReactNode; align?: "right"; className?: string };

function isColumnObject(column: Column): column is { label: ReactNode; align?: "right"; className?: string } {
  return typeof column === "object" && column !== null && "label" in column;
}

// Shared shell for the Budget page tables (categories, sinking expenses,
// source transfers). Columns are ReactNode so a header cell with its own
// interaction (a sortable header) still fits; pass `{label, align: "right"}`
// for figure columns. `bare` drops the shell's own border for a table that
// sits inside a Card panel. `footer` renders a totals row.
export function TableShell({
  columns,
  children,
  footer,
  bare = false,
}: {
  columns: Column[];
  children: ReactNode;
  footer?: ReactNode;
  bare?: boolean;
}) {
  return (
    <div className={cn("overflow-x-auto", !bare && "border border-border bg-surface")}>
      <table className="w-full text-sm">
        <thead>
          <tr className="h-9 border-b border-border text-left font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            {columns.map((column, index) => {
              const obj = isColumnObject(column) ? column : null;
              return (
                <th
                  key={index}
                  className={cn("px-4 font-medium", obj?.align === "right" && "text-right", obj?.className)}
                >
                  {obj ? obj.label : (column as ReactNode)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {footer && (
          <tfoot className="border-t border-border-strong font-medium">{footer}</tfoot>
        )}
      </table>
    </div>
  );
}

// An empty table's one row: a muted line of text, or with `onClick` an add
// button labeled `label` (the Forecast entries table still uses that form).
export function TableEmptyRow({
  colSpan,
  label,
  onClick,
}: {
  colSpan: number;
  label: string;
  onClick?: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-muted">
        {onClick ? (
          <Button type="button" variant="accent" size="icon" aria-label={label} onClick={onClick}>
            <AddIcon />
          </Button>
        ) : (
          label
        )}
      </td>
    </tr>
  );
}
