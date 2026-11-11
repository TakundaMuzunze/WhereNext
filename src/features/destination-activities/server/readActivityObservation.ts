import "server-only";

import { prisma } from "@/shared/lib/db/prisma";
import { providerJson, providerRetrievedAt, coolDownProviderResponse } from "@/features/destination-discovery/server/providerRequest";
import type { ActivityObservation } from "../model/activityEvidence";
import {
  activityObservationKey,
  validateCachedObservation,
  translateObservation,
  radiusMetres,
  resultLimit,
  reuseSeconds,
  type ActivityLocation,
} from "./activityObservation";
export { activityObservationKey, validateCachedObservation } from "./activityObservation";

type ActivityObservationResult = { observation: ActivityObservation | null; stale: boolean };
const sourceRequestDelayMs = 300;

export async function readActivityObservation(location: ActivityLocation, category: string, storedOnly = false): Promise<ActivityObservationResult> {
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

  if (storedOnly || !isLiveRetrievalEnabled || !apiKey) {
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
