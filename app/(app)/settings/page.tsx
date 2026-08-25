import { getSettings } from "@/lib/queries/settings";
import { getVendorRules } from "@/lib/queries/vendor-rules";
import { getFilterOptions } from "@/lib/queries/transactions";
import { deleteVendorRule } from "@/lib/actions/vendor-rules";
import { DecimalPlacesForm } from "@/components/settings/decimal-places-form";
import { RetentionForm } from "@/components/settings/retention-form";
import { MonthAheadForm } from "@/components/settings/month-ahead-form";
import { CreateVendorRuleForm } from "@/components/settings/create-vendor-rule-form";
import { Card } from "@/components/ui/card";
import { ActionButtonForm } from "@/components/ui/action-button-form";
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
        <p className="font-medium">Categorization rules</p>
        <p className="mt-1 mb-3 text-sm text-muted">
          Rules you&apos;ve established to automatically categorize transactions.
        </p>

        <CreateVendorRuleForm categories={categories} />

        {vendorRules.length === 0 ? (
          <p className="text-sm text-muted">No rules yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {vendorRules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  If <span className="font-medium">{rule.merchant_normalized}</span>, then{" "}
                  <span className="font-medium">
                    {(rule.categories as { name: string } | null)?.name ?? "—"}
                  </span>
                  <span className="ml-2 text-xs text-muted">
                    used {rule.use_count}&times;
                  </span>
                </span>
                <ActionButtonForm action={deleteVendorRule.bind(null, rule.id)} size="sm" tone="negative">
                  Delete
                </ActionButtonForm>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
