import { computeProgress } from "@/lib/progress";

export function ProgressBar({ total, spent }: { total: number; spent: number }) {
  const { pct, over } = computeProgress({ total, spent });
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
      <div
        className={`h-full transition-[width] duration-300 ease-out ${over ? "bg-negative" : "bg-foreground"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
