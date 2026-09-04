import { computeProgress } from "@/lib/progress";

export function ProgressBar({ total, spent }: { total: number; spent: number }) {
  const { pct, over } = computeProgress({ total, spent });
  return (
    // An alpha track reads at the same strength on the page and on a card; a
    // solid one is nearly invisible against --surface.
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-a3">
      <div
        className={`h-full transition-[width] duration-300 ease-entrance ${over ? "bg-negative" : "bg-foreground"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
