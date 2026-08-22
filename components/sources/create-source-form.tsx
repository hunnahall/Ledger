"use client";

import { useState } from "react";
import { createSource } from "@/lib/actions/sources";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<string, string> = {
  past_payment: "Past payment",
  future_repayment: "Future repayment",
  fund: "Fund",
};

export function CreateSourceForm({ funds }: { funds: { id: string; name: string }[] }) {
  const [type, setType] = useState("past_payment");

  return (
    <Card className="max-w-2xl p-4">
      <form action={createSource} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          New source name
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Checking, Reimbursement"
            className="w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Balance
          <input
            type="number"
            name="balance"
            step="0.01"
            defaultValue={0}
            className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        {(type === "past_payment" || type === "future_repayment") && (
          <label className="flex flex-col gap-1 text-sm">
            {type === "past_payment" ? "Deposit date" : "Expected deposit date"}
            <input
              type="date"
              name="deposit_date"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}

        {type === "fund" && (
          <div className="flex flex-col gap-1 text-sm">
            Fund(s)
            <div className="flex max-w-xs flex-wrap gap-2 rounded-md border border-border bg-background px-3 py-2">
              {funds.length === 0 && <span className="text-xs text-muted">No funds yet — add one below.</span>}
              {funds.map((fund) => (
                <label key={fund.id} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="fund_ids" value={fund.id} />
                  {fund.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" variant="accent">
          Create
        </Button>
      </form>
    </Card>
  );
}
