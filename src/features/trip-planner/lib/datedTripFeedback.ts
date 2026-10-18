import { z } from "zod";
import { createDatedTripDatesSchema, createDatedTripRequestSchema } from "@/entities/trip/model/datedTripRequestSchema";
import type { DatedTripDraft } from "./datedTripDraft";
import { londonToday, poundsToPence } from "./datedPlannerSearchParams";

export function getDatedTripFeedback(draft: DatedTripDraft, today = londonToday()) {
  const schema = createDatedTripRequestSchema(today);
  const adults = /^\d+$/.test(draft.adultCount) ? Number(draft.adultCount) : undefined;
  const budget = poundsToPence(draft.budget);
  const allowance = poundsToPence(draft.allowance);
  const errors: Record<string, string> = {};
  if (!schema.shape.departureAirportCode.safeParse(draft.departureAirportCode).success) errors.departureAirportCode = "Choose a departure airport.";
  if (!schema.shape.adultCount.safeParse(adults).success) errors.adultCount = "Enter a whole number from 1 to 9 adults.";
  if (!schema.shape.groupBudgetPence.safeParse(budget).success)
    errors.budget = "Enter a group budget from £1 to £100,000, with up to two decimal places.";
  if (!schema.shape.dailyAllowancePerPersonPence.safeParse(allowance).success)
    errors.allowance = "Enter a daily allowance from £0 to £1,000, with up to two decimal places.";
  const dates = createDatedTripDatesSchema(today).safeParse({ outboundDate: draft.outboundDate, returnDate: draft.returnDate });
  if (!dates.success)
    for (const issue of dates.error.issues) {
      const field = String(issue.path[0]);
      errors[field] = issue.code === "invalid_format" ? "Choose a valid date." : issue.message;
    }
  if (!schema.shape.preferences.safeParse({ tripType: draft.tripType, activities: draft.activities }).success) {
    if (!draft.tripType) errors.tripType = "Choose your kind of holiday.";
    else errors.activities = "Choose at least one activity for this holiday style.";
  }
  const validDates = z.iso.date().safeParse(draft.outboundDate).success && z.iso.date().safeParse(draft.returnDate).success;
  const duration = validDates
    ? (Date.parse(`${draft.returnDate}T00:00:00Z`) - Date.parse(`${draft.outboundDate}T00:00:00Z`)) / 86_400_000
    : undefined;
  const nights = duration !== undefined && duration >= 1 && duration <= 28 ? duration : undefined;
  const spending =
    nights !== undefined && !errors.adultCount && !errors.allowance && adults !== undefined && allowance !== undefined
      ? (nights + 1) * adults * allowance
      : undefined;
  const remaining = spending !== undefined && !errors.budget && budget !== undefined ? budget - spending : undefined;
  return {
    errors,
    nights,
    adults,
    budget: errors.budget ? undefined : budget,
    allowance: errors.allowance ? undefined : allowance,
    spending,
    remaining,
  };
}
