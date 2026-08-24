"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentBudget } from "@/lib/actions/budgets";
import { Select } from "@/components/ui/select";

export function BudgetSwitcher({
  budgets,
  selectedId,
}: {
  budgets: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextId: string) {
    setError(null);
    const result = await setCurrentBudget(nextId);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push(`/budgets/${nextId}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={selectedId} onChange={handleChange} className="w-40">
        {budgets.map((budget) => (
          <option key={budget.id} value={budget.id}>
            {budget.name}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
