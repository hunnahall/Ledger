import { getSettings } from "@/lib/queries/settings";
import { getOptionalUser } from "@/lib/supabase/auth";
import { DecimalPlacesForm } from "@/components/settings/decimal-places-form";
import { BudgetTypeForm } from "@/components/settings/budget-type-form";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { AccountCard } from "@/components/settings/account-card";
import { SettingRow } from "@/components/settings/setting-row";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function SettingsPage() {
  const [settings, { user }] = await Promise.all([getSettings(), getOptionalUser()]);

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <div>
        <h1>Settings</h1>
        <p className="mt-1 text-sm text-muted">Bank connections are on the Accounts page.</p>
      </div>

      <Card title="Display">
        <SettingRow label="Decimals" description="Show amounts as $1 or $1.50.">
          <DecimalPlacesForm decimalPlaces={settings.decimal_places} />
        </SettingRow>
        <SettingRow label="Appearance" description="System follows your device.">
          <ThemeToggle />
        </SettingRow>
      </Card>

      <Card title="Budgeting">
        <SettingRow
          label="Budget type"
          description="Rolling spends income as it arrives. Advanced uses this month's income for next month."
        >
          <BudgetTypeForm budgetType={settings.budget_type} />
        </SettingRow>
        <SettingRow label="Time zone" description="Decides when each day and month starts.">
          <TimezoneForm timezone={settings.timezone} />
        </SettingRow>
      </Card>

      {user?.email && <AccountCard email={user.email} />}
    </div>
  );
}
