import { z } from "zod";
import type { DatedTripRequest } from "@/entities/trip/model/types";
import type { DiscoveredFlightOption } from "../model/types";

const airportCode = z.string().regex(/^[A-Z]{3}$/);
const adultCount = z.number().int().min(1).max(9);

// Provider country names are matched explicitly; unfamiliar values are excluded.
const supportedCountries = new Set(["France", "Spain", "Portugal", "Italy", "Greece", "Malta"]);

const onwardUrl = z.url().refine((url) => {
  const parsed = new URL(url);
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === "www.google.com" &&
    parsed.pathname === "/travel/explore" &&
    !parsed.username &&
    !parsed.password &&
    !parsed.port
  );
}, "Expected a Google Travel Explore link.");

const exploreDestinationSchema = z.object({
  destination_id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  country: z
    .string()
    .trim()
    .refine((country) => supportedCountries.has(country)),
  destination_airport: z.object({ code: airportCode }),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  flight_price: z.number().finite().positive(),
  flight_duration: z.number().int().positive(),
  number_of_stops: z.number().int().nonnegative(),
  link: onwardUrl,
});

// Validate the envelope once, then each candidate separately so a malformed
// destination does not discard other usable options.
const exploreResponseSchema = z.object({
  search_metadata: z.object({
    status: z.literal("Success"),
    processed_at: z.string(),
  }),
  search_parameters: z.object({
    engine: z.literal("google_travel_explore"),
    departure_id: airportCode,
    currency: z.literal("GBP"),
    outbound_date: z.iso.date(),
    return_date: z.iso.date(),
    adults: adultCount,
  }),
  destinations: z.array(z.unknown()),
});

const priceContextSchema = z.object({
  adultCount,
  basis: z.enum(["per_adult", "total_party"]),
});

export type VerifiedPriceContext = z.infer<typeof priceContextSchema>;
type FlightRequest = Pick<DatedTripRequest, "departureAirportCode" | "outboundDate" | "returnDate" | "adultCount" | "currency">;

// Price context must come from a separately verified pricing contract.
export function parseExploreFlightOptions(
  rawResponse: unknown,
  priceContext: VerifiedPriceContext,
  request: FlightRequest,
  retrievedAt: string,
): { status: "valid"; options: DiscoveredFlightOption[] } | { status: "invalid_response" } {
  const response = exploreResponseSchema.safeParse(rawResponse);
  const pricing = priceContextSchema.safeParse(priceContext);
  if (!response.success || !pricing.success || !z.iso.datetime().safeParse(retrievedAt).success) return { status: "invalid_response" };

  const { search_metadata: metadata, search_parameters: parameters, destinations } = response.data;
  if (
    parameters.departure_id !== request.departureAirportCode ||
    parameters.outbound_date !== request.outboundDate ||
    parameters.return_date !== request.returnDate ||
    parameters.currency !== request.currency ||
    parameters.adults !== request.adultCount ||
    pricing.data.adultCount !== request.adultCount
  ) {
    return { status: "invalid_response" };
  }

  const processedAt = metadata.processed_at.replace(" ", "T").replace(/ UTC$/, "Z");

  if (!z.iso.datetime().safeParse(processedAt).success) return { status: "invalid_response" };

  const options = destinations.flatMap((rawDestination): DiscoveredFlightOption[] => {
    const result = exploreDestinationSchema.safeParse(rawDestination);

    if (!result.success) return [];

    const destination = result.data;

    if (
      destination.start_date !== request.outboundDate ||
      destination.end_date !== request.returnDate ||
      destination.end_date <= destination.start_date
    ) {
      return [];
    }

    // Accept penny precision, allowing only the tiny error from binary floats.
    const rawPence = destination.flight_price * 100;
    const amountPence = Math.round(rawPence);
    if (!Number.isSafeInteger(amountPence) || Math.abs(rawPence - amountPence) > 0.000001) return [];

    return [
      {
        destination: {
          providerId: destination.destination_id,
          name: destination.name,
          country: destination.country,
        },
        servingAirportCode: destination.destination_airport.code,
        departureAirportCode: request.departureAirportCode,
        outboundDate: destination.start_date,
        returnDate: destination.end_date,
        currency: parameters.currency,
        price: { amountPence, basis: pricing.data.basis, adultCount: pricing.data.adultCount },
        durationMinutes: destination.flight_duration,
        stops: destination.number_of_stops,
        retrievedAt,
        providerProcessedAt: new Date(processedAt).toISOString(),
        onwardUrl: destination.link,
      },
    ];
  });
  return { status: "valid", options };
}

// Preserve the convenient array-only interface for consumers that do not need
// to distinguish a malformed response from an empty search.
export function mapExploreDestinations(
  rawResponse: unknown,
  priceContext: VerifiedPriceContext,
  request: FlightRequest,
  retrievedAt: string,
): DiscoveredFlightOption[] {
  const result = parseExploreFlightOptions(rawResponse, priceContext, request, retrievedAt);
  return result.status === "valid" ? result.options : [];
}
