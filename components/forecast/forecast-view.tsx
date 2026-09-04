"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameForecast, updateForecastSource, deleteForecast } from "@/lib/actions/forecasts";
import { projectForecast } from "@/lib/forecast/project";
import { formatMoney } from "@/lib/format";
import { ForecastPicker } from "@/components/forecast/forecast-picker";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { ForecastEntriesTable } from "@/components/forecast/forecast-entries-table";
import { MonthlyTransferControl } from "@/components/forecast/monthly-transfer-control";
import { NameEditControl } from "@/components/sources/name-edit-control";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";

type SavedForecast = { id: string; name: string; sourceName: string; updatedAt: string };
type SourceOption = { id: string; name: string };
type ForecastDetail = {
  id: string;
  name: string;
  sourceId: string;
  sourceName: string;
  sourceBalance: number;
  monthlyTransferOverride: number | null;
  transferIsLive: boolean;
  effectiveMonthlyTransfer: number;
  entries: { id: string; month: string; description: string; isExpense: boolean; amount: number; updatedAt: string }[];
};

export function ForecastView({
  forecasts,
  sourceOptions,
  forecast,
  decimalPlaces,
  currentMonthISO,
}: {
  forecasts: SavedForecast[];
  sourceOptions: SourceOption[];
  forecast: ForecastDetail | null;
  decimalPlaces: number;
  currentMonthISO: string;
}) {
  if (!forecast) {
    return <ForecastPicker forecasts={forecasts} sourceOptions={sourceOptions} />;
  }

  return (
    <ForecastDetailView
      forecast={forecast}
      sourceOptions={sourceOptions}
      decimalPlaces={decimalPlaces}
      currentMonthISO={currentMonthISO}
    />
  );
}

function ForecastDetailView({
  forecast,
  sourceOptions,
  decimalPlaces,
  currentMonthISO,
}: {
  forecast: ForecastDetail;
  sourceOptions: SourceOption[];
  decimalPlaces: number;
  // Resolved server-side from settings.timezone -- the browser's own idea of
  // "this month" can differ from the account's.
  currentMonthISO: string;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  // The pending flags were previously discarded, so Delete had no disabled
  // state and a double-click fired two deletes and two router.push calls.
  const [sourceChangePending, startSourceTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const points = projectForecast({
    startingBalance: forecast.sourceBalance,
    monthlyTransfer: forecast.effectiveMonthlyTransfer,
    entries: forecast.entries.map((e) => ({ month: e.month, isExpense: e.isExpense, amount: e.amount })),
    startMonthISO: currentMonthISO,
  });

  async function handleSourceChange(sourceId: string) {
    if (sourceId === forecast.sourceId) return;
    if (forecast.entries.length > 0) {
      const ok = await confirm(
        "This forecast already has manual entries. Changing the source keeps them attached — continue?",
      );
      if (!ok) return;
    }
    const formData = new FormData();
    formData.set("source_id", sourceId);
    startSourceTransition(() => {
      updateForecastSource(forecast.id, null, formData);
    });
  }

  async function handleDelete() {
    const ok = await confirm(`Delete the "${forecast.name}" forecast?`);
    if (!ok) return;
    startDeleteTransition(async () => {
      await deleteForecast(forecast.id, null, new FormData());
      router.push("/forecast");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => router.push("/forecast")} className="text-sm text-muted hover:underline">
          ← All forecasts
        </button>
        <Button
          type="button"
          variant="secondary"
          tone="negative"
          size="sm"
          onClick={handleDelete}
          disabled={deletePending}
        >
          {deletePending ? "Deleting…" : "Delete forecast"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <NameEditControl action={renameForecast.bind(null, forecast.id)} name={forecast.name} />
        <Select
          uiSize="sm"
          className="w-40"
          value={forecast.sourceId}
          onChange={handleSourceChange}
          disabled={sourceChangePending}
        >
          {sourceOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {forecast.transferIsLive ? (
        <p className="text-sm text-muted">
          Monthly transfer: {formatMoney(forecast.effectiveMonthlyTransfer, decimalPlaces)}/mo — set on the{" "}
          <a href="/budget" className="underline">
            Budgets page
          </a>
        </p>
      ) : (
        <MonthlyTransferControl
          forecastId={forecast.id}
          amount={forecast.monthlyTransferOverride}
          decimalPlaces={decimalPlaces}
        />
      )}

      <Card className="p-5">
        <div className="h-64">
          <ForecastChart points={points} />
        </div>
      </Card>

      <ForecastEntriesTable forecastId={forecast.id} entries={forecast.entries} decimalPlaces={decimalPlaces} />
    </div>
  );
}
