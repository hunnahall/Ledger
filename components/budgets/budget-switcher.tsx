"use client";

import { useRouter } from "next/navigation";
import { setCurrentBudget } from "@/lib/actions/budgets";

export function BudgetSwitcher({
  budgets,
  selectedId,
}: {
  budgets: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  async function handleChange(nextId: string) {
    await setCurrentBudget(nextId);
    router.push(`/budgets/${nextId}`);
  }

  return (
    <select
      value={selectedId}
      onChange={(e) => handleChange(e.target.value)}
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
