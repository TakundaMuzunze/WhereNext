import type { DiscoveryRequest } from "../../destination-planning/model/discoveryRequest";
import type { ClimateMonth, ClimateObservation } from "../model/climateObservation";

type PreferenceKind = "beach" | "sightseeing";
type PreferenceStatus = "within_preferences" | "trade_offs" | "unknown";
type ClimatePreference = { kind: PreferenceKind; status: PreferenceStatus };

export type SeasonalMonth = ClimateMonth & { preferences: ClimatePreference[] };
export type SeasonalGuidance = {
  observation: ClimateObservation | null;
  months: SeasonalMonth[];
  recommendedMonths: number[];
  ranking: { matched: number; tradeOffs: number };
};

export const climatePreferences = {
  beach: { minimumTemperature: 18, maximumTemperature: 26, maximumPrecipitation: 2 },
  sightseeing: { minimumTemperature: 12, maximumTemperature: 22, maximumPrecipitation: 2 },
};

export const sightseeingInterests = new Set(["Walking tours", "Architecture", "Historic sites", "Old towns"]);

function requestedMonths(timing: DiscoveryRequest["timing"]): number[] {
  if (timing.kind === "flexible") {
    return Array.from({ length: 12 }, (_, index) => index + 1);
  }

  if (timing.kind === "month") {
    return [Number(timing.month.slice(5, 7))];
  }

  const cursor = new Date(`${timing.outboundDate.slice(0, 7)}-01T00:00:00Z`);
  const finalDate = Date.parse(`${timing.returnDate}T00:00:00Z`);
  const months: number[] = [];

  while (cursor.getTime() <= finalDate && months.length < 12) {
    months.push(cursor.getUTCMonth() + 1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function preferenceStatus(month: ClimateMonth, kind: PreferenceKind): PreferenceStatus {
  if (month.meanTemperatureC === null || month.precipitationMmPerDay === null) {
    return "unknown";
  }

  // Reviewed product preferences, not scientific suitability or safety thresholds.
  const { minimumTemperature, maximumTemperature, maximumPrecipitation } = climatePreferences[kind];
  const temperatureFits = month.meanTemperatureC >= minimumTemperature && month.meanTemperatureC <= maximumTemperature;
  const isDrier = month.precipitationMmPerDay <= maximumPrecipitation;

  return temperatureFits && isDrier ? "within_preferences" : "trade_offs";
}

export function assessSeason(observation: ClimateObservation | null, timing: DiscoveryRequest["timing"], activities: string[]): SeasonalGuidance {
  const preferenceKinds: PreferenceKind[] = [];

  if (activities.includes("Beaches")) {
    preferenceKinds.push("beach");
  }

  if (activities.some((activity) => sightseeingInterests.has(activity))) {
    preferenceKinds.push("sightseeing");
  }

  const months = requestedMonths(timing).map((monthNumber): SeasonalMonth => {
    const storedMonth = observation?.months.find((month) => month.month === monthNumber);
    const month = storedMonth ?? { month: monthNumber, meanTemperatureC: null, precipitationMmPerDay: null };

    return { ...month, preferences: preferenceKinds.map((kind) => ({ kind, status: preferenceStatus(month, kind) })) };
  });
  const ranking = { matched: 0, tradeOffs: 0 };
  const recommendedMonths = months
    .filter((month) => month.preferences.length > 0 && month.preferences.every((preference) => preference.status === "within_preferences"))
    .map((month) => month.month);

  if (timing.kind === "flexible") {
    // Compare the best available period, not the number of matching months.
    for (const month of months) {
      const matched = month.preferences.filter((preference) => preference.status === "within_preferences").length;
      const tradeOffs = month.preferences.filter((preference) => preference.status === "trade_offs").length;

      if (month === months[0] || matched > ranking.matched || (matched === ranking.matched && tradeOffs < ranking.tradeOffs)) {
        ranking.matched = matched;
        ranking.tradeOffs = tradeOffs;
      }
    }
  } else {
    for (const kind of preferenceKinds) {
      const statuses = months.map((month) => month.preferences.find((preference) => preference.kind === kind)?.status ?? "unknown");

      if (statuses.length > 0 && statuses.every((status) => status === "within_preferences")) {
        ranking.matched++;
      } else if (statuses.includes("trade_offs")) {
        ranking.tradeOffs++;
      }
    }
  }

  return { observation, months, recommendedMonths: timing.kind === "flexible" ? recommendedMonths : [], ranking };
}

export type SeasonalFit = "matching" | "tradeoffs" | "unverified";

export function seasonalFit(guidance: SeasonalGuidance, timing: DiscoveryRequest["timing"]): SeasonalFit {
  const preferences = guidance.months.flatMap((month) => month.preferences);

  // Interests without a climate rule remain available without a seasonal filter.
  if (preferences.length === 0) {
    return "matching";
  }

  if (timing.kind === "flexible") {
    const hasMatchingMonth = guidance.months.some((month) => month.preferences.every((preference) => preference.status === "within_preferences"));

    if (hasMatchingMonth) {
      return "matching";
    }

    const hasUnverifiedPossibility = guidance.months.some((month) => month.preferences.every((preference) => preference.status !== "trade_offs"));
    return hasUnverifiedPossibility ? "unverified" : "tradeoffs";
  }

  if (preferences.some((preference) => preference.status === "trade_offs")) {
    return "tradeoffs";
  }

  if (preferences.some((preference) => preference.status === "unknown")) {
    return "unverified";
  }

  return "matching";
}
