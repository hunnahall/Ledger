"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { shortMonthLabel } from "@/components/dashboard/format";
import { selectionParam, toggleMonth } from "@/lib/dashboard-months";

// The months the Dashboard shows, oldest to newest, plus All. Each month
// toggles in or out, so any mix can be shown; from All, a month narrows the
// view to just that month. The choice lives in the URL (?months=).
export function MonthPicker({ months, selected }: { months: string[]; selected: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(selected);
  const all = shown.length === months.length;

  function go(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    const value = selectionParam(next, months);
    if (value) params.set("months", value);
    else params.delete("months");
    params.delete("month");
    const qs = params.toString();
    startTransition(() => {
      setShown(next);
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const chip = (active: boolean) =>
    cn(
      "h-[var(--control-md)] px-3.5 text-[13px] transition-colors duration-[120ms] ease-standard",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
      active ? "bg-fill-active font-medium text-foreground" : "text-foreground-secondary hover:bg-fill-hover",
    );

  return (
    <div
      role="group"
      aria-label="Months shown"
      aria-busy={isPending}
      className="flex flex-wrap gap-px border border-border-strong bg-surface p-px"
    >
      {[...months].reverse().map((month) => {
        const active = shown.includes(month);
        return (
          <button
            key={month}
            type="button"
            aria-pressed={active}
            title={all ? `Show only ${shortMonthLabel(month)}` : active ? "Remove from the view" : "Add to the view"}
            onClick={() => go(toggleMonth(shown, month, months))}
            className={chip(active && !all)}
          >
            {shortMonthLabel(month)}
          </button>
        );
      })}
      <button type="button" aria-pressed={all} onClick={() => go([...months].sort())} className={chip(all)}>
        All
      </button>
    </div>
  );
}
