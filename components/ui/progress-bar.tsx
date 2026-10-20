import { computeProgress } from "@/lib/progress";

// 4px bar in the signature color; warning at 90% and danger past 100%.
export function ProgressBar({ total, spent }: { total: number; spent: number }) {
  const { pct, over } = computeProgress({ total, spent });
  const tone = over ? "bg-danger" : pct >= 90 ? "bg-warning" : "bg-accent";
  return (
    <div className="h-1 w-full bg-fill-active">
      <div
        className={`h-full transition-[width] duration-[360ms] ease-entrance ${tone}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
