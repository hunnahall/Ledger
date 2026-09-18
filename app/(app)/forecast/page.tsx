import { getForecasts, getForecast } from "@/lib/queries/forecasts";
import { getSourceOptions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { ForecastView } from "@/components/forecast/forecast-view";
import { currentMonthISO } from "@/lib/dates";

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
      </div>

      <ForecastView
        forecasts={forecasts}
        sourceOptions={sourceOptions}
        forecast={forecast}
        decimalPlaces={settings.decimal_places}
        currentMonthISO={currentMonthISO(settings.timezone)}
      />
    </div>
  );
}
