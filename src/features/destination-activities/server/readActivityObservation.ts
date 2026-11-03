import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { DestinationActivityEvidence } from "@/generated/prisma/client";
import { prisma } from "@/shared/lib/db/prisma";
import { providerJson, providerRetrievedAt, coolDownProviderResponse } from "@/features/destination-discovery/server/providerRequest";
import { activityObservationSchema, type ActivityObservation, type ActivityPlace } from "../model/activityEvidence";
import { distanceMetres } from "../lib/distanceMetres";
import type { ActivityLocation } from "./resolveActivityLocation";

const radiusMetres = 4000;
const resultLimit = 20;
const reuseSeconds = 7 * 24 * 60 * 60;
const sourceRequestDelayMs = 300;

const featureSchema = z.object({
  properties: z.object({
    place_id: z.string().min(1),
    name: z.string().trim().min(1),
    categories: z.array(z.string()),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    datasource: z
      .object({
        raw: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  }),
});

type ActivityObservationResult = {
  observation: ActivityObservation | null;
  stale: boolean;
};

function placeAccess(raw: Record<string, unknown>): ActivityPlace["access"] {
  const isDisused = raw.disused === "yes";
  const isAbandoned = raw.abandoned === "yes";
  const isExplicitlyClosed = raw.opening_hours === "closed" || raw.opening_hours === "off";

  if (isDisused || isAbandoned || isExplicitlyClosed) {
    return "closed";
  }

  const hasRestrictedAccess = raw.access === "no" || raw.access === "private";

  if (hasRestrictedAccess) {
    return "restricted";
  }

  return "unknown";
}

function sourceUrl(raw: Record<string, unknown>, latitude: number, longitude: number) {
  const osmTypes: Record<string, string> = {
    n: "node",
    w: "way",
    r: "relation",
    node: "node",
    way: "way",
    relation: "relation",
  };

  let osmType: string | undefined;

  if (typeof raw.osm_type === "string" && Object.hasOwn(osmTypes, raw.osm_type)) {
    osmType = osmTypes[raw.osm_type];
  }

  const osmId = String(raw.osm_id ?? "");
  const hasValidOsmId = /^[1-9]\d*$/.test(osmId);

  if (osmType && hasValidOsmId) {
    return `https://www.openstreetmap.org/${osmType}/${osmId}`;
  }

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

function translateObservation(body: unknown, location: ActivityLocation, category: string, retrievedAt: string): ActivityObservation {
  const responseSchema = z.object({
    features: z.array(z.unknown()).max(resultLimit),
  });
  const response = responseSchema.parse(body);

  const places: ActivityPlace[] = [];
  const seenReferences = new Set<string>();
  let hasIncompleteEvidence = response.features.length === resultLimit;

  for (const feature of response.features) {
    const validation = featureSchema.safeParse(feature);

    if (!validation.success) {
      hasIncompleteEvidence = true;
      continue;
    }

    const place = validation.data.properties;
    const distanceFromCentre = distanceMetres(location.latitude, location.longitude, place.lat, place.lon);
    const matchesCategory = place.categories.includes(category);
    const isWithinSearchArea = distanceFromCentre <= radiusMetres;

    if (!matchesCategory || !isWithinSearchArea) {
      hasIncompleteEvidence = true;
      continue;
    }

    const rawProperties = place.datasource?.raw ?? {};
    const placeSourceUrl = sourceUrl(rawProperties, place.lat, place.lon);
    const hasRepeatedId = seenReferences.has(place.place_id);
    const hasRepeatedUrl = seenReferences.has(placeSourceUrl);

    if (hasRepeatedId || hasRepeatedUrl) {
      continue;
    }

    seenReferences.add(place.place_id);
    seenReferences.add(placeSourceUrl);

    places.push({
      sourceId: place.place_id,
      name: place.name,
      categories: place.categories,
      latitude: place.lat,
      longitude: place.lon,
      sourceUrl: placeSourceUrl,
      access: placeAccess(rawProperties),
    });
  }

  return {
    ...location,
    category,
    radiusMetres,
    limit: resultLimit,
    retrievedAt,
    coverage: hasIncompleteEvidence ? "incomplete" : "sample",
    places,
  };
}

export function validateCachedObservation(
  cachedEvidence: DestinationActivityEvidence,
  location: ActivityLocation,
  category: string,
): ActivityObservation | null {
  const validation = activityObservationSchema.safeParse(cachedEvidence.observation);

  if (!validation.success) {
    return null;
  }

  const observation = validation.data;
  const matchesDestination = observation.destinationId === location.destinationId;
  const matchesCategory = observation.category === category;
  const matchesCentre = observation.latitude === location.latitude && observation.longitude === location.longitude;
  const matchesSearchSettings = observation.radiusMetres === radiusMetres && observation.limit === resultLimit;

  if (!matchesDestination || !matchesCategory || !matchesCentre || !matchesSearchSettings) {
    return null;
  }

  const retrievedTime = Date.parse(observation.retrievedAt);
  const hasMatchingTimestamp = cachedEvidence.retrievedAt.getTime() === retrievedTime;
  const hasFutureTimestamp = retrievedTime > Date.now();

  if (!hasMatchingTimestamp || hasFutureTimestamp) {
    return null;
  }

  return observation;
}

export function activityObservationKey(location: ActivityLocation, category: string): string {
  // Version and geometry affect reuse. Dates, airports and traveller IDs do not belong in this key.
  const searchIdentity = {
    source: "geoapify",
    version: 1,
    ...location,
    category,
    radiusMetres,
    limit: resultLimit,
  };
  const serialisedSearchIdentity = JSON.stringify(searchIdentity);
  return createHash("sha256").update(serialisedSearchIdentity).digest("hex");
}

export async function readActivityObservation(location: ActivityLocation, category: string): Promise<ActivityObservationResult> {
  const requestKey = activityObservationKey(location, category);
  let previousObservation: ActivityObservation | null = null;

  try {
    const cachedEvidence = await prisma.destinationActivityEvidence.findUnique({
      where: { requestKey },
    });

    if (cachedEvidence) {
      previousObservation = validateCachedObservation(cachedEvidence, location, category);

      if (previousObservation) {
        const now = Date.now();
        const retrievalAgeMs = now - Date.parse(previousObservation.retrievedAt);
        const hasNotExpired = cachedEvidence.expiresAt.getTime() > now;
        const hasRecentRetrieval = retrievalAgeMs < reuseSeconds * 1000;

        if (hasNotExpired && hasRecentRetrieval) {
          return {
            observation: previousObservation,
            stale: false,
          };
        }
      }
    }
  } catch {
    // Fail closed before spending credits if the cache migration/storage is unavailable.
    return {
      observation: null,
      stale: false,
    };
  }

  const fallbackResult: ActivityObservationResult = {
    observation: previousObservation,
    stale: previousObservation !== null,
  };
  const isLiveRetrievalEnabled = process.env.ACTIVITY_EVIDENCE_ENABLED === "true";
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!isLiveRetrievalEnabled || !apiKey) {
    return fallbackResult;
  }

  try {
    const url = new URL("https://api.geoapify.com/v2/places");
    const queryParameters = new URLSearchParams({
      categories: category,
      filter: `circle:${location.longitude},${location.latitude},${radiusMetres}`,
      bias: `proximity:${location.longitude},${location.latitude}`,
      limit: String(resultLimit),
      apiKey,
    });
    url.search = queryParameters.toString();

    // Pace cold queries. The shared reservation guard also limits concurrent app instances.
    await new Promise((resolve) => setTimeout(resolve, sourceRequestDelayMs));

    const responseBody = await providerJson("geoapify", url, reuseSeconds);
    const retrievedAt = providerRetrievedAt(url) ?? new Date().toISOString();
    let observation: ActivityObservation;

    try {
      observation = translateObservation(responseBody, location, category, retrievedAt);
    } catch {
      coolDownProviderResponse(url);
      return fallbackResult;
    }

    const retrievedDate = new Date(retrievedAt);
    const expiresAt = new Date(retrievedDate.getTime() + reuseSeconds * 1000);
    const cacheData = {
      observation,
      retrievedAt: retrievedDate,
      expiresAt,
    };

    await prisma.destinationActivityEvidence.upsert({
      where: { requestKey },
      create: {
        requestKey,
        destinationId: location.destinationId,
        ...cacheData,
      },
      update: cacheData,
    });

    return {
      observation,
      stale: false,
    };
  } catch {
    return fallbackResult;
  }
}
