import { getRules } from "@/lib/queries/rules";
import { getFilterOptions } from "@/lib/queries/transactions";
import { deleteRule, updateRule } from "@/lib/actions/rules";
import { RunRulesButton } from "@/components/rules/run-rules-button";
import { AddRuleButton } from "@/components/rules/add-rule-button";
import { RuleRow } from "@/components/rules/rule-row";
import { Card } from "@/components/ui/card";

export default async function RulesPage() {
  const [rules, { categories, sources }] = await Promise.all([getRules(), getFilterOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Rules</h1>
          <p className="mt-1 text-sm text-muted">
            Rules categorize Budget-sourced transactions and source the rest automatically.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <AddRuleButton categories={categories} sources={sources} />
          <RunRulesButton />
        </div>
      </div>

      {rules.length === 0 ? (
        <Card className="text-center text-sm text-muted">No rules yet.</Card>
      ) : (
        <Card className="p-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Rules ({rules.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={{
                  id: rule.id,
                  merchantNormalized: rule.merchant_normalized,
                  categoryId: rule.category_id,
                  sourceId: rule.source_id,
                  isIncome: rule.is_income,
                  isExclude: rule.is_exclude,
                  categoryName: rule.is_income
                    ? "Income"
                    : rule.is_exclude
                      ? "Excluded"
                      : rule.category_id
                        ? ((rule.categories as { name: string } | null)?.name ?? "—")
                        : `Source: ${(rule.sources as { name: string } | null)?.name ?? "—"}`,
                  useCount: rule.use_count,
                }}
                categories={categories}
                sources={sources}
                updateAction={updateRule.bind(null, rule.id)}
                deleteAction={deleteRule.bind(null, rule.id)}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
