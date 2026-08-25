import { redirect } from "next/navigation";
import { getCurrentBudget } from "@/lib/queries/budgets";

// Every user has exactly one budget (auto-provisioned at signup — see
// handle_new_user), so this route just forwards to its detail page.
export default async function BudgetsPage() {
  const budget = await getCurrentBudget();
  redirect(`/budgets/${budget!.id}`);
}
