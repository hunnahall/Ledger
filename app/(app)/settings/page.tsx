import { getSettings } from "@/lib/queries/settings";
import { updateDecimalPlaces } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Preferences that affect how amounts display and how you enter them.
        </p>
      </div>

      <form
        action={updateDecimalPlaces}
        className="flex max-w-sm flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          Decimal places
          <select
            name="decimal_places"
            defaultValue={settings.decimal_places}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value={0}>0 (e.g. $42)</option>
            <option value={1}>1 (e.g. $42.5)</option>
            <option value={2}>2 (e.g. $42.50)</option>
          </select>
        </label>
        <p className="text-xs text-muted">
          This only affects display and manual-entry rounding. Amounts synced from your
          bank are always stored at full precision.
        </p>
        <button
          type="submit"
          className="w-fit rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
        >
          Save
        </button>
      </form>

      <div className="rounded-lg border border-dashed border-border bg-surface p-5">
        <p className="font-medium">Connected accounts</p>
        <p className="mt-1 text-sm text-muted">
          Connect and manage banks via SimpleFin from the Accounts page.
        </p>
      </div>
    </div>
  );
}
