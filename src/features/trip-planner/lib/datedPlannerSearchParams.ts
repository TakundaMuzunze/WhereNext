import { createDatedTripRequestSchema, type DatedTripRequest } from "@/entities/trip/model/datedTripRequestSchema";
import type { PlannerSearchParams } from "./plannerSearchParams";

export function londonToday(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

// Repeated URL parameters arrive as arrays. A scalar field must occur once.
function readSingleValue(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value;
}

// Only digit-only strings become numbers. Do not let an empty string become 0,
// or allow decimal/exponent notation to slip through Number() conversion.
function readInteger(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const containsOnlyDigits = /^\d+$/.test(value);

  if (!containsOnlyDigits) {
    return undefined;
  }

  return Number(value);
}

function readActivities(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

export function parseDatedTripRequest(params: PlannerSearchParams, today = londonToday()): DatedTripRequest | null {
  if (params.kind !== "dated" || params.draft !== undefined) {
    return null;
  }

  // Mixing the old and new formats could give the same trip two durations,
  // budgets or departures. Reject that ambiguity rather than choosing one.
  const legacyFields = ["month", "duration", "departure", "budget", "travellers"];
  const hasLegacyFields = legacyFields.some((field) => params[field] !== undefined);

  if (hasLegacyFields) {
    return null;
  }

  // First decode the URL representation. These values are still untrusted.
  const candidateRequest = {
    kind: params.kind,
    departureAirportCode: readSingleValue(params.departureAirportCode),
    outboundDate: readSingleValue(params.outboundDate),
    returnDate: readSingleValue(params.returnDate),
    adultCount: readInteger(params.adultCount),
    currency: readSingleValue(params.currency),
    groupBudgetPence: readInteger(params.groupBudgetPence),
    dailyAllowancePerPersonPence: readInteger(params.dailyAllowancePerPersonPence),
    preferences: {
      tripType: readSingleValue(params.tripType),
      activities: readActivities(params.activity),
    },
  };

  // apply the same domain rules used by the form.
  const schema = createDatedTripRequestSchema(today);
  const result = schema.safeParse(candidateRequest);

  if (!result.success) {
    return null;
  }

  return result.data;
}

export function serializeDatedTripRequest(request: DatedTripRequest): string {
  const params = new URLSearchParams({
    kind: request.kind,
    departureAirportCode: request.departureAirportCode,
    outboundDate: request.outboundDate,
    returnDate: request.returnDate,
    adultCount: String(request.adultCount),
    currency: request.currency,
    groupBudgetPence: String(request.groupBudgetPence),
    dailyAllowancePerPersonPence: String(request.dailyAllowancePerPersonPence),
    tripType: request.preferences.tripType,
  });

  for (const activity of request.preferences.activities) {
    params.append("activity", activity);
  }

  return params.toString();
}

export function poundsToPence(value: string): number | undefined {
  const isValidPoundAmount = /^\d+(\.\d{1,2})?$/.test(value);

  if (!isValidPoundAmount) {
    return undefined;
  }

  // Split the digits instead of multiplying a decimal number by 100.
  const [pounds, pennies = ""] = value.split(".");
  const wholePoundsInPence = Number(pounds) * 100;
  const remainingPence = Number(pennies.padEnd(2, "0"));

  return wholePoundsInPence + remainingPence;
}

export function tripNights(request: DatedTripRequest): number {
  const outboundMidnight = Date.parse(`${request.outboundDate}T00:00:00Z`);
  const returnMidnight = Date.parse(`${request.returnDate}T00:00:00Z`);
  const millisecondsPerDay = 86_400_000;
  const stayInMilliseconds = returnMidnight - outboundMidnight;

  return stayInMilliseconds / millisecondsPerDay;
}
