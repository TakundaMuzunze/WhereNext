import type { PlannerAnswers, TripType } from "@/entities/trip/model/types";
import { tripTypes } from "@/shared/data/TripTypes";

export type PlannerSearchParams = Record<string, string | string[] | undefined>;

const validTripTypes = new Set<TripType>(tripTypes.map(({ value }) => value));

function getSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getPositiveNumber(value: string | string[] | undefined): number | null {
  const number = Number(getSingleValue(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function isTripType(value: string): value is TripType {
  return validTripTypes.has(value as TripType);
}

export function serializePlannerAnswers(answers: PlannerAnswers): string {
  const params = new URLSearchParams({
    departure: answers.departure,
    month: answers.travelMonth,
    duration: String(answers.duration),
    budget: String(answers.budget),
    travellers: String(answers.travellers),
    tripType: answers.tripType,
  });

  answers.activities.forEach((activity) => params.append("activity", activity));

  return params.toString();
}

export function parsePlannerAnswers(params: PlannerSearchParams): PlannerAnswers | null {
  const departure = getSingleValue(params.departure).trim();
  const travelMonth = getSingleValue(params.month).trim();
  const duration = getPositiveNumber(params.duration);
  const budget = getPositiveNumber(params.budget);
  const travellers = getPositiveNumber(params.travellers);
  const tripType = getSingleValue(params.tripType);
  const rawActivities = params.activity;
  const activities = (Array.isArray(rawActivities) ? rawActivities : rawActivities ? [rawActivities] : [])
    .map((activity) => activity.trim())
    .filter(Boolean);

  if (!departure || !travelMonth || duration === null || budget === null || travellers === null || !isTripType(tripType) || activities.length === 0) {
    return null;
  }

  return {
    departure,
    travelMonth,
    duration,
    budget,
    travellers,
    tripType,
    activities,
  };
}
