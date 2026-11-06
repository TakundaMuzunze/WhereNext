import { climatePreferences } from "../lib/assessSeason";
import type { SeasonalGuidance as Guidance, SeasonalMonth } from "../lib/assessSeason";

export function monthName(month: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));
}

function temperatureLabel(value: number | null): string {
  if (value === null) {
    return "unknown";
  }

  return `${value.toFixed(1)}°C`;
}

function precipitationLabel(value: number | null): string {
  if (value === null) {
    return "unknown";
  }

  return `${value.toFixed(2)} mm/day`;
}

function preferenceDescription(month: SeasonalMonth): string {
  if (month.preferences.length === 0) {
    return "Climate context only; no preference rule for these interests.";
  }

  return month.preferences
    .map((preference) => {
      const label = preference.kind === "beach" ? "Beach climate" : "Outdoor sightseeing";
      const descriptions = {
        within_preferences: "matches our climate preferences",
        trade_offs: "some climate trade-offs",
        unknown: "not enough climate data",
      };
      return `${label}: ${descriptions[preference.status]}`;
    })
    .join(" · ");
}

export function SeasonalSummary({ guidance }: { guidance?: Guidance }) {
  if (!guidance?.observation) {
    return <p className="text-sm text-muted">Seasonal guidance: unknown — regional climate data unavailable.</p>;
  }

  let summary = "Historical climate available; explore monthly conditions and trade-offs.";
  let preferences = "";

  if (guidance.months.length === 1) {
    const month = guidance.months[0];
    summary = `${monthName(month.month)} · ${temperatureLabel(month.meanTemperatureC)} mean air · ${precipitationLabel(month.precipitationMmPerDay)} precipitation`;
    preferences = preferenceDescription(month);
  } else if (guidance.recommendedMonths.length > 0) {
    summary = `Climate periods worth considering: ${guidance.recommendedMonths.map(monthName).join(", ")}.`;
  } else if (guidance.months.length <= 2) {
    summary = `${guidance.months.map((month) => monthName(month.month)).join(" / ")} climate: explore each month's conditions and trade-offs.`;
  }

  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-3 text-sm">
      <p className="leading-6 font-medium">{summary}</p>
      {preferences && <p className="mt-1 text-xs leading-5 text-muted">{preferences}</p>}
      <p className="mt-2 text-xs leading-5 text-muted">Historical regional averages · not a forecast</p>
    </div>
  );
}

function MonthlyConditions({ month }: { month: SeasonalMonth }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-4">
      <h4 className="font-medium">{monthName(month.month)}</h4>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs leading-5 text-muted">Mean air temperature</dt>
          <dd className="mt-1 font-serif text-3xl">{temperatureLabel(month.meanTemperatureC)}</dd>
          <p className="mt-1 text-xs text-muted">Day and night average</p>
        </div>
        <div>
          <dt className="text-xs leading-5 text-muted">Average precipitation</dt>
          <dd className="mt-1 font-serif text-3xl">
            {month.precipitationMmPerDay === null ? "Unknown" : month.precipitationMmPerDay.toFixed(2)}
            {month.precipitationMmPerDay !== null && <span className="ml-1 font-sans text-sm">mm/day</span>}
          </dd>
          <p className="mt-1 text-xs text-muted">Amount, not rain probability</p>
        </div>
      </dl>
      {month.preferences.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-3 text-sm leading-6">
          {month.preferences.map((preference) => (
            <li key={preference.kind}>
              <span className="font-medium">{preference.kind === "beach" ? "Beach climate" : "Outdoor sightseeing"}: </span>
              {preference.status === "within_preferences"
                ? "matches our climate preferences"
                : preference.status === "trade_offs"
                  ? "some climate trade-offs"
                  : "not enough climate data"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted">Climate context only; we don’t assess seasonal fit for your selected interests.</p>
      )}
    </div>
  );
}

export function SeasonalEvidence({ guidance }: { guidance: Guidance }) {
  const observation = guidance.observation;
  const singleMonth = guidance.months.length === 1 ? guidance.months[0] : null;

  return (
    <section aria-label="Seasonal guidance" className="my-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="p-4 sm:p-5">
        <p className="text-xs font-medium tracking-wide text-muted">PLAN YOUR VISIT</p>
        <h3 className="mt-1 font-serif text-2xl">Seasonal guidance</h3>
        {!observation ? (
          <div className="mt-3">
            <SeasonalSummary guidance={guidance} />
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-muted">Regional historical averages, 1991–2020; not a forecast for your dates.</p>
            {singleMonth ? (
              <div className="mt-4">
                <MonthlyConditions month={singleMonth} />
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm leading-6">
                  {guidance.recommendedMonths.length > 0
                    ? `Climate periods worth considering: ${guidance.recommendedMonths.map(monthName).join(", ")}.`
                    : guidance.months.length <= 2
                      ? `Your trip spans ${guidance.months.map((month) => monthName(month.month)).join(" and ")}. Check conditions for each month.`
                      : "Explore monthly conditions to help choose when to travel."}
                </p>
                <details className="mt-2">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm text-primary">View monthly climate and preference trade-offs</summary>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {guidance.months.map((month) => (
                      <MonthlyConditions key={month.month} month={month} />
                    ))}
                  </div>
                </details>
              </>
            )}
            <p className="mt-3 text-xs leading-5 text-muted">
              Climate preferences do not confirm activity availability. Beach access, sea temperature, safe swimming and local events remain
              unverified.
            </p>
            <p className="mt-3 text-xs leading-5 text-muted">
              Climate data:{" "}
              <a
                className="cursor-pointer text-primary underline"
                href="https://power.larc.nasa.gov/docs/referencing/"
                target="_blank"
                rel="noreferrer"
              >
                NASA POWER / MERRA-2
              </a>
            </p>
          </>
        )}
      </div>
      {observation && (
        <details className="border-t border-border px-4 sm:px-5">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-primary">How to read this climate data</summary>
          <div className="space-y-3 pb-5 text-xs leading-5 text-muted">
            <p>
              Mean air temperature includes day and night; precipitation is a daily average, not rain probability. Monthly averages cannot predict
              weather during your trip.
            </p>
            <p>
              Preferences: beach climate {climatePreferences.beach.minimumTemperature}–{climatePreferences.beach.maximumTemperature}°C mean; outdoor
              sightseeing {climatePreferences.sightseeing.minimumTemperature}–{climatePreferences.sightseeing.maximumTemperature}°C mean;
              precipitation up to {climatePreferences.beach.maximumPrecipitation} mm/day. These are product preferences, not scientific suitability or
              safety thresholds. Unknown activity evidence remains unknown.
            </p>
            <p>
              The 0.5° x 0.625° source grid covers a broad area; coastal and mountain microclimates can differ. Regional model elevation:{" "}
              {Math.round(observation.elevationMetres)} m. Trails, opening, crowds and access are unverified.
            </p>
            <p>
              Source:{" "}
              <a
                className="cursor-pointer text-primary underline"
                href="https://power.larc.nasa.gov/docs/referencing/"
                target="_blank"
                rel="noreferrer"
              >
                NASA Langley POWER, funded by NASA Earth Science Division
              </a>
              , MERRA-2, Climatology API {observation.apiVersion}. Retrieved{" "}
              {new Date(observation.retrievedAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}. Historical baseline reviewed for reuse annually.
            </p>
          </div>
        </details>
      )}
    </section>
  );
}
