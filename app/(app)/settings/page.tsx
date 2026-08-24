import { getSettings } from "@/lib/queries/settings";
import { getVendorRules } from "@/lib/queries/vendor-rules";
import { getFilterOptions } from "@/lib/queries/transactions";
import { deleteVendorRule } from "@/lib/actions/vendor-rules";
import { DecimalPlacesForm } from "@/components/settings/decimal-places-form";
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
        <p className="mt-1 text-sm text-muted">
          Preferences that affect how amounts display and how you enter them.
        </p>
      </div>

      <Card className="max-w-sm p-5">
        <DecimalPlacesForm decimalPlaces={settings.decimal_places} />
      </Card>

      <Card className="max-w-sm p-5">
        <p className="text-sm font-medium">Appearance</p>
        <p className="mt-1 mb-3 text-xs text-muted">
          System follows your device&apos;s light/dark setting.
        </p>
        <ThemeToggle />
      </Card>

      <Card className="border-dashed p-5">
        <p className="font-medium">Connected accounts</p>
        <p className="mt-1 text-sm text-muted">
          Connect and manage banks via SimpleFin from the Accounts page.
        </p>
      </Card>

      <Card className="p-5">
        <p className="font-medium">Categorization rules</p>
        <p className="mt-1 mb-3 text-sm text-muted">
          Whenever you categorize a transaction and confirm the prompt, Ledger remembers the
          merchant so future transactions from it (manual entry or bank sync) get categorized
          automatically.
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
