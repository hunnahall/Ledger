import { getForecasts, getForecast } from "@/lib/queries/forecasts";
import { getSourceOptions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { ForecastView } from "@/components/forecast/forecast-view";

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const [forecasts, sourceOptions, settings, forecast] = await Promise.all([
    getForecasts(),
    getSourceOptions(),
    getSettings(),
    id ? getForecast(id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
        <p className="mt-1 text-sm text-muted">
          Project a Source&apos;s balance forward under its monthly transfer plus any manual
          entries you add here — read-only against the rest of the app, never writes back to
          Sources or Budgets.
        </p>
      </div>

      <ForecastView
        forecasts={forecasts}
        sourceOptions={sourceOptions}
        forecast={forecast}
        decimalPlaces={settings.decimal_places}
      />
    </div>
  );
}
