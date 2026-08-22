"use client";

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

  async function handleChange(nextId: string) {
    await setCurrentBudget(nextId);
    router.push(`/budgets/${nextId}`);
  }

  return (
    <Select value={selectedId} onChange={handleChange} className="w-40">
      {budgets.map((budget) => (
        <option key={budget.id} value={budget.id}>
          {budget.name}
        </option>
      ))}
    </Select>
  );
}
