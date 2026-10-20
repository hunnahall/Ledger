import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";

// Shared shell for the budgets-page tables (categories, sinking expenses,
// source transfers) — wrapper/table/thead were byte-for-byte identical
// across all three before this extraction. Columns are ReactNode (not
// plain strings) so a header cell with its own interaction — e.g.
// CategoriesTable's sortable "Monthly amount" button — still fits.
export function TableShell({ columns, children }: { columns: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            {columns.map((column, index) => (
              <th key={index} className="px-4 py-2.5 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  label,
  onClick,
}: {
  colSpan: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center">
        <Button type="button" variant="accent" size="icon" aria-label={label} onClick={onClick}>
          <AddIcon />
        </Button>
      </td>
    </tr>
  );
}
