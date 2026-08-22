import { getSettings } from "@/lib/queries/settings";
import { getVendorRules } from "@/lib/queries/vendor-rules";
import { updateDecimalPlaces } from "@/lib/actions/settings";
import { deleteVendorRule } from "@/lib/actions/vendor-rules";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function SettingsPage() {
  const [settings, vendorRules] = await Promise.all([getSettings(), getVendorRules()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Preferences that affect how amounts display and how you enter them.
        </p>
      </div>

      <Card className="max-w-sm p-5">
        <form action={updateDecimalPlaces} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Decimal places
            <Select name="decimal_places" defaultValue={settings.decimal_places} className="w-full">
              <option value={0}>0 (e.g. $42)</option>
              <option value={1}>1 (e.g. $42.5)</option>
              <option value={2}>2 (e.g. $42.50)</option>
            </Select>
          </label>
          <p className="text-xs text-muted">
            This only affects display and manual-entry rounding. Amounts synced from your
            bank are always stored at full precision.
          </p>
          <Button type="submit" variant="primary" className="w-fit">
            Save
          </Button>
        </form>
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
        <p className="font-medium">Learned categorization rules</p>
        <p className="mt-1 mb-3 text-sm text-muted">
          Whenever you categorize a transaction, Ledger remembers the merchant so future
          transactions from it (manual entry or bank sync) get categorized automatically.
        </p>
        {vendorRules.length === 0 ? (
          <p className="text-sm text-muted">No rules learned yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Merchant</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Used</th>
                  <th className="w-16 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {vendorRules.map((rule) => (
                  <tr key={rule.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{rule.merchant_normalized}</td>
                    <td className="px-3 py-2">
                      {(rule.categories as { name: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {rule.use_count}&times;
                    </td>
                    <td className="px-3 py-2">
                      <form action={deleteVendorRule.bind(null, rule.id)}>
                        <Button type="submit" size="sm" tone="negative">
                          Delete
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
