import { z } from "zod";
import { tripTypes } from "@/shared/data/tripTypes";
import type { PlannerSearchParams } from "./plannerSearchParams";

// A draft describes editable inputs, not a valid holiday request. For example,
// an empty return date and a fractional adult count must survive navigation.
const datedTripDraftSchema = z
  .object({
    departureAirportCode: z.enum(["", "LHR", "MAN"]),
    outboundDate: z.string().max(64),
    returnDate: z.string().max(64),
    adultCount: z.string().max(64),
    budget: z.string().max(64),
    allowance: z.string().max(64),
    tripType: z.enum(["", ...tripTypes.map((tripType) => tripType.value)]),
    activities: z.array(z.string().max(80)).max(5),
  })
  .refine((draft) => {
    const selectedTripType = tripTypes.find((tripType) => tripType.value === draft.tripType);
    const allowedActivities = selectedTripType?.activities ?? [];

    return draft.activities.every((activity) => allowedActivities.includes(activity));
  });

export type DatedTripDraft = z.infer<typeof datedTripDraftSchema>;

export function parseDatedTripDraft(params: PlannerSearchParams): DatedTripDraft | null {
  if (params.kind !== "dated" || params.draft !== "1") {
    return null;
  }

  const legacyFields = ["month", "duration", "departure", "budget", "travellers"];
  const hasLegacyFields = legacyFields.some((field) => params[field] !== undefined);

  if (hasLegacyFields) {
    return null;
  }

  let activities: string[] = [];

  if (Array.isArray(params.activity)) {
    activities = params.activity;
  } else if (typeof params.activity === "string") {
    activities = [params.activity];
  }

  const result = datedTripDraftSchema.safeParse({
    departureAirportCode: params.departureAirportCode,
    outboundDate: params.outboundDate,
    returnDate: params.returnDate,
    adultCount: params.adultCount,
    budget: params.groupBudgetPounds,
    allowance: params.dailyAllowancePerPersonPounds,
    tripType: params.tripType,
    activities,
  });

  if (!result.success) {
    return null;
  }

  return result.data;
}

export function serializeDatedTripDraft(draft: DatedTripDraft): string {
  const params = new URLSearchParams({
    kind: "dated",
    draft: "1",
    departureAirportCode: draft.departureAirportCode,
    outboundDate: draft.outboundDate,
    returnDate: draft.returnDate,
    adultCount: draft.adultCount,
    groupBudgetPounds: draft.budget,
    dailyAllowancePerPersonPounds: draft.allowance,
    tripType: draft.tripType,
  });

  for (const activity of draft.activities) {
    params.append("activity", activity);
  }

  return params.toString();
}
