import { bullet, type BulletTone } from "@/lib/charts/bullet";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

const FILL: Record<BulletTone, string> = {
  accent: "bg-chart-1",
  warning: "bg-chart-caution",
  danger: "bg-danger",
};

// A category's spending on a fixed 0-130% scale: a 4px fill, a 2px x 12px
// budget tick in ink, and a 1px pace tick (an even pace through today) in
// --fg-3. A $0 budget draws nothing.
export function BulletBar({
  spent,
  budget,
  monthProgress,
  decimalPlaces,
}: {
  spent: number;
  budget: number;
  /** dayOfMonth / daysInMonth for the current month; null hides the pace tick. */
  monthProgress: number | null;
  decimalPlaces: number;
}) {
  const b = bullet({ spent, budget, monthProgress });
  if (!b) return null;
  const money = (n: number) => formatMoney(n, decimalPlaces);
  const label = [
    `Spent ${money(spent)} of ${money(budget)} budget (${b.percent}%)`,
    monthProgress !== null && `even pace by today ${money(budget * monthProgress)}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div role="img" aria-label={label} className="relative h-3 w-full">
      <div className="absolute inset-x-0 top-1 h-1 bg-fill-active" />
      <div
        className={cn(
          "absolute left-0 top-1 h-1 transition-[width] duration-[360ms] ease-entrance motion-reduce:transition-none",
          FILL[b.tone],
        )}
        style={{ width: `${b.fill * 100}%` }}
      />
      {b.paceMark !== null && (
        <div className="absolute inset-y-0 w-px -translate-x-1/2 bg-muted" style={{ left: `${b.paceMark * 100}%` }} />
      )}
      <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${b.budgetMark * 100}%` }} />
    </div>
  );
}
