import { getSettings } from "@/lib/queries/settings";
import { getVendorRules } from "@/lib/queries/vendor-rules";
import { getFilterOptions } from "@/lib/queries/transactions";
import { updateDecimalPlaces } from "@/lib/actions/settings";
import { createVendorRule, deleteVendorRule } from "@/lib/actions/vendor-rules";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
          <Button type="submit" variant="accent" className="w-fit">
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
        <p className="font-medium">Categorization rules</p>
        <p className="mt-1 mb-3 text-sm text-muted">
          Whenever you categorize a transaction and confirm the prompt, Ledger remembers the
          merchant so future transactions from it (manual entry or bank sync) get categorized
          automatically.
        </p>

        <form
          action={createVendorRule}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            If description contains
            <input
              type="text"
              name="merchant"
              required
              placeholder="e.g. Trader Joe's"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Then category is
            <Select name="category_id" required uiSize="sm" className="w-40" placeholder="Choose a category">
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="accent" size="sm">
            Add rule
          </Button>
        </form>

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
                <form action={deleteVendorRule.bind(null, rule.id)}>
                  <Button type="submit" size="sm" tone="negative">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
