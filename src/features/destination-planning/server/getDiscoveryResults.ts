import { readDestinationImages } from "@/features/destination-images/server/readDestinationImages";
import "server-only";

import { prisma } from "@/shared/lib/db/prisma";
import { destinations } from "@/shared/data/destinations";
import { activityCategory } from "@/features/destination-activities/lib/activityCategories";
import { assessActivity, unknownActivity } from "@/features/destination-activities/lib/assessActivity";
import { activityObservationKey, validateCachedObservation } from "@/features/destination-activities/server/readActivityObservation";
import { rankDestinations, type DiscoveryCandidate } from "../lib/rankDestinations";
import type { DiscoveryRequest } from "../model/discoveryRequest";

export type DiscoveryResults = {
  candidates: DiscoveryCandidate[];
  evidenceUnavailable: boolean;
};

export async function getDiscoveryResults(request: DiscoveryRequest): Promise<DiscoveryResults> {
  const candidates = await prisma.destinationCandidate.findMany({ orderBy: { id: "asc" } });
  const images = await readDestinationImages(candidates.map((candidate) => candidate.id));
  const identityLinks = await prisma.destinationGuideIdentity.findMany();
  const guidesById = new Map(destinations.map((destination) => [destination.id, destination]));
  const canonicalIds = new Map<string, string>();

  for (const link of identityLinks) {
    if (guidesById.has(link.legacyDestinationId)) {
      canonicalIds.set(link.wikidataId, link.legacyDestinationId);
    }
  }

  const destinationIds = candidates.map((candidate) => canonicalIds.get(candidate.wikidataId) ?? candidate.id);
  let evidenceUnavailable = false;
  let observations: Awaited<ReturnType<typeof prisma.destinationActivityEvidence.findMany>> = [];

  try {
    observations = await prisma.destinationActivityEvidence.findMany({
      where: { destinationId: { in: destinationIds } },
    });
  } catch {
    // Catalogue discovery remains available when evidence storage needs attention.
    evidenceUnavailable = true;
  }

  const observationsByKey = new Map(observations.map((observation) => [observation.requestKey, observation]));
  const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
  const now = Date.now();
  const maximumAgeMs = 7 * 24 * 60 * 60 * 1000;
  const assessedCandidates: DiscoveryCandidate[] = [];

  for (const candidate of candidates) {
    const guideId = canonicalIds.get(candidate.wikidataId);
    const guide = guideId ? guidesById.get(guideId) : undefined;
    const location = {
      destinationId: canonicalIds.get(candidate.wikidataId) ?? candidate.id,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    };
    const assessments = request.activities.map((activity) => {
      const category = activityCategory(activity);

      if (!category) {
        return unknownActivity(activity, "unsupported_interest");
      }

      const requestKey = activityObservationKey(location, category);
      const cachedEvidence = observationsByKey.get(requestKey);

      if (!cachedEvidence) {
        return unknownActivity(activity, "unavailable");
      }

      const observation = validateCachedObservation(cachedEvidence, location, category);

      if (!observation) {
        return unknownActivity(activity, "unavailable");
      }

      const ageMs = now - Date.parse(observation.retrievedAt);
      const hasExpired = cachedEvidence.expiresAt.getTime() <= now || ageMs >= maximumAgeMs;

      if (hasExpired) {
        return unknownActivity(activity, "stale_evidence", observation);
      }

      return assessActivity(activity, observation);
    });

    assessedCandidates.push({
      id: candidate.id,
      name: candidate.name,
      country: countryNames.of(candidate.countryCode) ?? candidate.countryCode,
      ...(images.has(candidate.id) ? { image: images.get(candidate.id) } : {}),
      ...(guide ? { guideImage: guide.image } : {}),
      assessments,
    });
  }

  return {
    candidates: rankDestinations(assessedCandidates),
    evidenceUnavailable,
  };
}
