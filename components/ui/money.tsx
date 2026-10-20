import { formatMoneyParts } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Money({
  amount,
  decimalPlaces = 2,
  symbol = true,
  className,
}: {
  amount: number;
  decimalPlaces?: number;
  /** false for table cells, which carry no $ per cell. */
  symbol?: boolean;
  className?: string;
}) {
  const { whole, fraction } = formatMoneyParts(amount, decimalPlaces, { symbol });
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {whole}
      {fraction && <span className="text-[0.8em] opacity-70">{fraction}</span>}
    </span>
  );
}
