import { getSettings } from "@/lib/queries/settings";
import { getVendorRules } from "@/lib/queries/vendor-rules";
import { getFilterOptions } from "@/lib/queries/transactions";
import { deleteVendorRule, updateVendorRule } from "@/lib/actions/vendor-rules";
import { DecimalPlacesForm } from "@/components/settings/decimal-places-form";
import { RetentionForm } from "@/components/settings/retention-form";
import { MonthAheadForm } from "@/components/settings/month-ahead-form";
import { CreateVendorRuleForm } from "@/components/settings/create-vendor-rule-form";
import { RunRulesButton } from "@/components/settings/run-rules-button";
import { VendorRuleRow } from "@/components/settings/vendor-rule-row";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function SettingsPage() {
  const [settings, vendorRules, { categories }] = await Promise.all([
    getSettings(),
    getVendorRules(),
    getFilterOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <Card className="min-w-56 flex-1 p-5">
          <DecimalPlacesForm decimalPlaces={settings.decimal_places} />
        </Card>

        <Card className="min-w-56 flex-1 p-5">
          <p className="text-sm font-medium">Appearance</p>
          <ThemeToggle className="mt-3" />
        </Card>

        <Card className="min-w-56 flex-1 p-5">
          <RetentionForm retentionDays={settings.retention_days} />
        </Card>

        <Card className="min-w-56 flex-1 p-5">
          <MonthAheadForm monthAhead={settings.month_ahead} />
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">Categorization rules</p>
            <p className="mt-1 text-sm text-muted">
              Rules you&apos;ve established to automatically categorize transactions.
            </p>
          </div>
          <RunRulesButton />
        </div>

        <div className="mt-3">
          <CreateVendorRuleForm categories={categories} />
        </div>

        {vendorRules.length === 0 ? (
          <p className="text-sm text-muted">No rules yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {vendorRules.map((rule) => (
              <VendorRuleRow
                key={rule.id}
                rule={{
                  id: rule.id,
                  merchantNormalized: rule.merchant_normalized,
                  categoryId: rule.category_id,
                  isIncome: rule.is_income,
                  categoryName: rule.is_income
                    ? "Income"
                    : ((rule.categories as { name: string } | null)?.name ?? "—"),
                  useCount: rule.use_count,
                }}
                categories={categories}
                updateAction={updateVendorRule.bind(null, rule.id)}
                deleteAction={deleteVendorRule.bind(null, rule.id)}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
