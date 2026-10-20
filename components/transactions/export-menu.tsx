"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { ShareIcon } from "@/components/ui/icons";

type ExportRange = "all" | "30d";

export function ExportMenu() {
  const [range, setRange] = useState<ExportRange>("all");

  return (
    <div className="flex items-center gap-2">
      <Select
        value={range}
        onChange={(value) => setRange(value as ExportRange)}
        className="w-40"
      >
        <option value="all">All transactions</option>
        <option value="30d">Last 30 days</option>
      </Select>
      <a
        href={`/api/transactions/export${range === "30d" ? "?range=30d" : ""}`}
        className="inline-flex h-[var(--control-md)] items-center gap-2 whitespace-nowrap border border-border-strong bg-surface px-3 text-sm font-medium transition-[background-color,border-color] duration-[120ms] ease-standard hover:border-muted hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ShareIcon size={16} />
        Export
      </a>
    </div>
  );
}
