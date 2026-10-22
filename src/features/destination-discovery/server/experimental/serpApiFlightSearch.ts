import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createDatedTripRequestSchema } from "@/entities/trip/model/datedTripRequestSchema";
import { londonToday } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { parseExploreFlightOptions } from "../../lib/mapExploreDestinations";
import type { FlightSearchResult } from "../../model/types";
import { reserveSerpApiSearch } from "../searchAllowance";

const searchSettingsSchema = z.object({
  enabled: z.literal("true"),
  apiKey: z.string().trim().min(1),
  // Set only AFTER the checks described in docs/live-travel/server-search.md.
  permittedUseReviewed: z.literal("true"),
  priceBasis: z.enum(["per_adult", "total_party"]),
});

export async function searchSerpApiFlightOptions(input: unknown): Promise<FlightSearchResult> {
  // 1. Check the trip before doing any work that could spend credits.
  const validatedTrip = createDatedTripRequestSchema(londonToday()).safeParse(input);

  if (!validatedTrip.success) return { status: "invalid_request" };

  // Research-only: this provider was rejected for production capacity.
  if (process.env.NODE_ENV === "production" || process.env.SERPAPI_FEASIBILITY_ENABLED !== "true") return { status: "unavailable" };

  // 2. Check that the explicit feasibility request has been configured.
  const validatedSettings = searchSettingsSchema.safeParse({
    enabled: process.env.FLIGHT_SEARCH_ENABLED,
    apiKey: process.env.SERPAPI_API_KEY,
    permittedUseReviewed: process.env.SERPAPI_PERMITTED_USE_REVIEWED,
    priceBasis: process.env.SERPAPI_VERIFIED_PRICE_BASIS,
  });

  if (!validatedSettings.success) return { status: "unavailable" };

  const trip = validatedTrip.data;
  const settings = validatedSettings.data;

  // 3. Build the provider request. These are SerpApi parameter names.
  const parameters = new URLSearchParams({
    engine: "google_travel_explore",
    departure_id: trip.departureAirportCode,
    arrival_area_id: "/m/02j9z", // Europe; country filtering still happens in the parser.
    outbound_date: trip.outboundDate,
    return_date: trip.returnDate,
    adults: String(trip.adultCount),
    currency: trip.currency,
    type: "1", // Round trip.
    travel_class: "1", // Economy.
    hl: "en",
    gl: "uk",
  });

  // hash gives identical searches the same identifier without storing
  const requestKey = createHash("sha256").update(`explore-v1:${settings.priceBasis}:${parameters}`).digest("hex");

  // 4. Reserve one credit. Stop here if the database cannot grant it.
  try {
    const reservation = await reserveSerpApiSearch(requestKey);
    if (reservation.status !== "reserved") return reservation;
  } catch {
    // Database failures must never fall back to an unmetered provider request.
    return { status: "unavailable" };
  }

  // 5. Make one provider call, allowing at most 20 seconds.
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    parameters.set("api_key", settings.apiKey);
    // No redirects, retries, pagination, paid fallback or destination fan-out.
    const response = await fetch(`https://serpapi.com/search.json?${parameters}`, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });

    if (!response.ok) return { status: "provider_failure" };

    const raw: unknown = await response.json();

    const retrievedAt = new Date().toISOString();

    const priceContext = { adultCount: trip.adultCount, basis: settings.priceBasis };
    const parsed = parseExploreFlightOptions(raw, priceContext, trip, retrievedAt);

    if (parsed.status === "invalid_response") return { status: "provider_failure" };

    if (parsed.options.length === 0) return { status: "empty" };

    return { status: "success", options: parsed.options };
  } catch {
    // Fetch errors can contain the API key, so return only a safe status.
    return { status: "provider_failure" };
  } finally {
    clearTimeout(timeout);
  }
}
