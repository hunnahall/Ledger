import { PagePlaceholder } from "@/components/ui/page-placeholder";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;

  return (
    <PagePlaceholder
      title="Budget"
      description={`Category detail for budget ${budgetId} will render here.`}
    />
  );
}
