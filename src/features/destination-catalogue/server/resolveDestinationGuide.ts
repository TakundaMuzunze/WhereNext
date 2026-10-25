import "server-only";

import type { Destination } from "@/entities/destination/model/types";
import { destinations } from "@/shared/data/destinations";
import { prisma } from "@/shared/lib/db/prisma";

export async function resolveDestinationGuide(input: unknown): Promise<Destination | null> {
  if (typeof input !== "string" || input.length > 128) {
    return null;
  }

  const existingGuide = destinations.find((destination) => destination.id === input);

  if (existingGuide) {
    return existingGuide;
  }

  const wikidataMatch = input.match(/^wikidata:(Q[1-9]\d*)$/);

  if (!wikidataMatch) {
    return null;
  }

  const identityLink = await prisma.destinationGuideIdentity.findUnique({
    where: { wikidataId: wikidataMatch[1] },
    select: { legacyDestinationId: true },
  });

  if (!identityLink) {
    return null;
  }

  return destinations.find((destination) => destination.id === identityLink.legacyDestinationId) ?? null;
}
