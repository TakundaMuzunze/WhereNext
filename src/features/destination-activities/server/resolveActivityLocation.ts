import "server-only";

import { isImportedDestinationId } from "@/entities/destination/model/importedDestination";
import { resolveDestinationGuide } from "@/features/destination-catalogue/server/resolveDestinationGuide";
import { prisma } from "@/shared/lib/db/prisma";

export type ActivityLocation = {
  destinationId: string;
  latitude: number;
  longitude: number;
};

type ResolvedActivityLocation = {
  destinationId: string;
  location: ActivityLocation | null;
};

export async function resolveActivityLocation(requestedDestinationId: string): Promise<ResolvedActivityLocation | null> {
  const guide = await resolveDestinationGuide(requestedDestinationId);

  if (isImportedDestinationId(requestedDestinationId)) {
    const candidate = await prisma.destinationCandidate.findUnique({
      where: { id: requestedDestinationId },
    });

    if (candidate) {
      const destinationId = guide?.id ?? candidate.id;
      const location: ActivityLocation = {
        destinationId,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      };

      return {
        destinationId,
        location,
      };
    }
  }

  if (!guide) {
    return null;
  }

  const identityLinks = await prisma.destinationGuideIdentity.findMany({
    where: { legacyDestinationId: guide.id },
    select: { wikidataId: true },
  });
  const linkedWikidataIds = identityLinks.map((link) => link.wikidataId);

  const candidates = await prisma.destinationCandidate.findMany({
    where: { wikidataId: { in: linkedWikidataIds } },
    select: { latitude: true, longitude: true },
    take: 2,
  });

  // Multiple mapped records require a geography decision. Do not guess a centre or substitute an airport.
  if (candidates.length !== 1) {
    return {
      destinationId: guide.id,
      location: null,
    };
  }

  const location: ActivityLocation = {
    destinationId: guide.id,
    latitude: candidates[0].latitude,
    longitude: candidates[0].longitude,
  };

  return {
    destinationId: guide.id,
    location,
  };
}
