"use client";

import { useMemo, useState, useTransition } from "react";
import { updateTimezone } from "@/lib/actions/settings";
import { Select } from "@/components/ui/select";

// The zone list comes from the browser rather than a bundled table so it
// tracks the runtime's own tzdata. The database validates the chosen name
// against pg_timezone_names on write regardless.
function zoneOptions(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  if (!zones.includes(current)) zones = [current, ...zones];
  if (!zones.includes("UTC")) zones = ["UTC", ...zones];
  return zones;
}

export function TimezoneForm({ timezone }: { timezone: string }) {
  const [value, setValue] = useState(timezone);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const zones = useMemo(() => zoneOptions(timezone), [timezone]);

  return (
    <div>
      <p className="text-sm font-medium">Time zone</p>
      <p className="mt-1 text-sm text-muted">
        Decides when a month starts and ends — the budget reset, income sweep and sinking-fund
        contribution all follow it.
      </p>
      <Select
        uiSize="sm"
        className="mt-3 w-full"
        value={value}
        disabled={pending}
        onChange={(next) => {
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await updateTimezone(next);
            if (result?.error) {
              setError(result.error);
              setValue(timezone);
            }
          });
        }}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </Select>
      {error && <p className="mt-2 text-sm text-negative">{error}</p>}
    </div>
  );
}
