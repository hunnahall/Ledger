import { formatMoneyParts } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Money({
  amount,
  decimalPlaces = 2,
  className,
}: {
  amount: number;
  decimalPlaces?: number;
  className?: string;
}) {
  const { whole, fraction } = formatMoneyParts(amount, decimalPlaces);
  return (
    <span className={cn("font-data tabular-nums", className)}>
      {whole}
      {fraction && <span className="text-[0.75em] opacity-70">{fraction}</span>}
    </span>
  );
}
