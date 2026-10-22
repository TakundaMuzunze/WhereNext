import "server-only";
import { createDatedTripRequestSchema } from "@/entities/trip/model/datedTripRequestSchema";
import { londonToday } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import type { FlightSearchResult } from "../model/types";

export type { FlightSearchResult } from "../model/types";

export async function searchFlightOptions(input: unknown): Promise<FlightSearchResult> {
  const trip = createDatedTripRequestSchema(londonToday()).safeParse(input);
  if (!trip.success) return { status: "invalid_request" };

  // No production provider currently meets the approved free-only scope.
  // In particular, old SerpApi flags must not activate a rejected dependency.
  // Keep validated trip input usable while the replacement is established.
  return { status: "unavailable" };
}
