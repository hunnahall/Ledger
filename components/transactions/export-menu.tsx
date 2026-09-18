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
        uiSize="sm"
        className="w-40"
      >
        <option value="all">All transactions</option>
        <option value="30d">Last 30 days</option>
      </Select>
      <a
        href={`/api/transactions/export${range === "30d" ? "?range=30d" : ""}`}
        aria-label="Export CSV"
        className="flex items-center justify-center rounded-md bg-mark p-2 text-mark-foreground shadow-xs transition-[filter,box-shadow] duration-[120ms] ease-standard hover:brightness-[0.96] active:brightness-[0.92]"
      >
        <ShareIcon />
      </a>
    </div>
  );
}
