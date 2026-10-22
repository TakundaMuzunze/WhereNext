import "server-only";
import { z } from "zod";
import { createDatedTripRequestSchema } from "@/entities/trip/model/datedTripRequestSchema";
import { londonToday } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { estimateDiscoveryCosts, rankDiscovery } from "../lib/rankDiscovery";
import type { ActivityEvidence, DiscoveryRecommendation, DiscoveryResult } from "../model/discovery";
import { providerJson, providerRetrievedAt } from "./providerRequest";

const iata = z.string().regex(/^[A-Z]{3}$/);
const countryNames: Record<string, string> = { FR: "France", ES: "Spain", PT: "Portugal", IT: "Italy", GR: "Greece", MT: "Malta" };
const citySchema = z.object({
  code: iata,
  name: z.string().min(1),
  country_code: z.string(),
  coordinates: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
});
const flightSchema = z.object({
  destination: iata,
  origin_airport: iata,
  destination_airport: iata,
  price: z.number().positive().max(1_000_000),
  departure_at: z.iso.datetime({ offset: true }),
  return_at: z.iso.datetime({ offset: true }),
  transfers: z.number().int().nonnegative(),
  link: z.string().startsWith("/search/"),
});
const geoPlaceSchema = z.object({
  geonameId: z.number().int().positive(),
  name: z.string(),
  countryCode: z.string(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
const poiSchema = z.object({
  properties: z.object({
    name: z.string().min(1),
    categories: z.array(z.string()),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    place_id: z.string(),
  }),
});

// Only direct category evidence. Subjective qualities (quiet, romantic, luxury)
// and activities without a precise category intentionally remain unknown.
export const activityCategories: Readonly<Record<string, string>> = {
  Museums: "entertainment.museum",
  Beaches: "beach",
  Bars: "catering.bar",
  "Historic sites": "heritage",
  "Nature parks": "national_park",
};

function distanceKm(lat: number, lon: number, otherLat: number, otherLon: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const a =
    Math.sin(radians(otherLat - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(otherLat)) * Math.sin(radians(otherLon - lon) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

async function resolveCity(city: z.infer<typeof citySchema>) {
  const url = new URL("https://secure.geonames.org/searchJSON");
  url.search = new URLSearchParams({
    username: process.env.GEONAMES_USERNAME ?? "",
    name_equals: city.name,
    country: city.country_code,
    featureClass: "P",
    maxRows: "10",
    lang: "en",
  }).toString();
  const body = z.object({ geonames: z.array(z.unknown()) }).parse(await providerJson("geonames", url, 604800));
  const matches = body.geonames
    .flatMap((row) => {
      const parsed = geoPlaceSchema.safeParse(row);
      if (!parsed.success || parsed.data.countryCode !== city.country_code) return [];
      const place = parsed.data;
      const distance = distanceKm(city.coordinates.lat, city.coordinates.lon, place.lat, place.lng);
      return distance <= 30 ? [{ ...place, distance }] : [];
    })
    .sort((a, b) => a.distance - b.distance);
  // Do not guess between nearby same-name records of similar proximity.
  if (!matches[0] || (matches[1] && matches[1].distance - matches[0].distance < 2)) return null;
  return matches[0];
}

async function activityEvidence(activity: string, place: z.infer<typeof geoPlaceSchema> | null, query: boolean): Promise<ActivityEvidence> {
  const category = activityCategories[activity];
  const unknown: ActivityEvidence = { activity, status: "unknown", places: [] };
  if (!category || !place || !query) return unknown;
  const url = new URL("https://api.geoapify.com/v2/places");
  url.search = new URLSearchParams({
    categories: category,
    filter: `circle:${place.lng},${place.lat},4000`,
    bias: `proximity:${place.lng},${place.lat}`,
    limit: "20",
    apiKey: process.env.GEOAPIFY_API_KEY ?? "",
  }).toString();
  const body = z.object({ features: z.array(z.unknown()) }).parse(await providerJson("geoapify", url, 604800));
  const seen = new Set<string>();
  const places = body.features
    .flatMap((row) => {
      const parsed = poiSchema.safeParse(row);
      if (!parsed.success) return [];
      const poi = parsed.data.properties;
      if (!poi.categories.includes(category) || seen.has(poi.place_id) || distanceKm(place.lat, place.lng, poi.lat, poi.lon) > 4.1) return [];
      seen.add(poi.place_id);
      return [{ name: poi.name, sourceUrl: `https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lon}#map=17/${poi.lat}/${poi.lon}` }];
    })
    .slice(0, 3);
  return { activity, status: places.length ? "supported" : "unknown", places };
}

export async function discoverDestinations(input: unknown): Promise<DiscoveryResult> {
  const parsed = createDatedTripRequestSchema(londonToday()).safeParse(input);
  if (!parsed.success) return { status: "invalid_request" };
  if (
    process.env.LIVE_DISCOVERY_ENABLED === "false" ||
    !process.env.TRAVELPAYOUTS_API_TOKEN ||
    !process.env.GEONAMES_USERNAME ||
    !process.env.GEOAPIFY_API_KEY
  )
    return { status: "unavailable" };
  // Deployment requires deliberate enablement; local development uses configured keys.
  if (process.env.NODE_ENV === "production" && process.env.LIVE_DISCOVERY_ENABLED !== "true") return { status: "unavailable" };
  const trip = parsed.data;
  try {
    const url = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
    url.search = new URLSearchParams({
      origin: trip.departureAirportCode,
      departure_at: trip.outboundDate,
      return_at: trip.returnDate,
      one_way: "false",
      currency: "gbp",
      limit: "1000",
      sorting: "price",
      unique: "true",
    }).toString();
    const flightHeaders = { "X-Access-Token": process.env.TRAVELPAYOUTS_API_TOKEN };
    const body = z
      .object({ success: z.literal(true), currency: z.literal("gbp"), data: z.array(z.unknown()) })
      .parse(await providerJson("travelpayouts", url, 900, flightHeaders));
    const retrievedAt = providerRetrievedAt(url, flightHeaders) ?? new Date().toISOString();
    if (!body.data.length) return { status: "empty" };
    const citiesBody = z
      .array(z.unknown())
      .parse(await providerJson("travelpayouts", new URL("https://api.travelpayouts.com/data/en/cities.json"), 86400));
    const cities = new Map(
      citiesBody.flatMap((row) => {
        const city = citySchema.safeParse(row);
        return city.success && countryNames[city.data.country_code] ? [[city.data.code, city.data] as const] : [];
      }),
    );
    const seen = new Set<string>();
    const candidates = body.data
      .flatMap((row) => {
        const flight = flightSchema.safeParse(row);
        if (!flight.success) return [];
        const fare = flight.data;
        const city = cities.get(fare.destination);
        if (
          !city ||
          fare.origin_airport !== trip.departureAirportCode ||
          fare.departure_at.slice(0, 10) !== trip.outboundDate ||
          fare.return_at.slice(0, 10) !== trip.returnDate
        )
          return [];
        const onward = new URL(fare.link, "https://www.aviasales.com");
        if (onward.origin !== "https://www.aviasales.com") return [];
        return [{ fare, city, onwardUrl: onward.toString() }];
      })
      .sort((a, b) => a.fare.price - b.fare.price)
      .filter(({ city }) => {
        if (seen.has(city.code)) return false;
        seen.add(city.code);
        return true;
      })
      .slice(0, 4);
    if (!candidates.length) return { status: "empty" };
    let partial = body.data.length >= 1000;
    const recommendations: DiscoveryRecommendation[] = [];
    // Sequential destinations bound pressure on free services. At most two
    // supported activity queries per destination; all others remain explicit unknowns.
    for (const { fare, city, onwardUrl } of candidates) {
      let place: Awaited<ReturnType<typeof resolveCity>> = null;
      try {
        place = await resolveCity(city);
      } catch {
        partial = true;
      }
      if (!place) partial = true;
      const selected = trip.preferences.activities.filter((activity) => activityCategories[activity]).slice(0, 2);
      const evidence: ActivityEvidence[] = [];
      for (const activity of trip.preferences.activities) {
        try {
          evidence.push(await activityEvidence(activity, place, selected.includes(activity)));
        } catch {
          partial = true;
          evidence.push({ activity, status: "unknown", places: [] });
        }
      }
      const flightPerAdultPence = Math.round(fare.price * 100);
      recommendations.push({
        id: `travelpayouts:${city.code}`,
        name: city.name,
        country: countryNames[city.country_code],
        airport: fare.destination_airport,
        geonamesId: place?.geonameId ?? null,
        evidence,
        flightPerAdultPence,
        ...estimateDiscoveryCosts(flightPerAdultPence, trip),
        onwardUrl,
        retrievedAt,
        stops: fare.transfers,
      });
    }
    return { status: "success", recommendations: rankDiscovery(recommendations), partial };
  } catch {
    return { status: "provider_failure" };
  }
}
