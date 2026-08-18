"use client";

import { useRouter } from "next/navigation";

export function BudgetSwitcher({
  budgets,
  selectedId,
}: {
  budgets: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/budgets/${e.target.value}`)}
      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
    >
      {budgets.map((budget) => (
        <option key={budget.id} value={budget.id}>
          {budget.name}
        </option>
      ))}
    </select>
  );
}
