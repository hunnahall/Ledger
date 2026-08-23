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
        className="flex items-center justify-center rounded-md bg-mark p-2 text-mark-foreground transition-all duration-150 hover:-translate-y-0.5 hover:shadow-elevated hover:brightness-95 active:translate-y-0 active:scale-[0.98]"
      >
        <ShareIcon />
      </a>
    </div>
  );
}
