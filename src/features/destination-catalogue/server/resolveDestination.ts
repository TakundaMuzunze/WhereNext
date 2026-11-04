import { readDestinationImages } from "@/features/destination-images/server/readDestinationImages";
import "server-only";

import type { Destination } from "@/entities/destination/model/types";
import { isImportedDestinationId, type ImportedDestination } from "@/entities/destination/model/importedDestination";
import { getDestinationCandidate } from "./readCandidates";
import { resolveDestinationGuide } from "./resolveDestinationGuide";

export type ResolvedDestination = { kind: "guide"; destination: Destination } | { kind: "imported"; destination: ImportedDestination };

export async function resolveDestination(input: unknown): Promise<ResolvedDestination | null> {
  const guide = await resolveDestinationGuide(input);

  if (guide) {
    return { kind: "guide", destination: guide };
  }

  if (!isImportedDestinationId(input)) {
    return null;
  }

  const candidate = await getDestinationCandidate(input);

  if (!candidate) {
    return null;
  }

  const images = await readDestinationImages([candidate.id]);

  return {
    kind: "imported",
    destination: {
      ...candidate,
      ...(images.has(candidate.id) ? { image: images.get(candidate.id) } : {}),
      country: new Intl.DisplayNames(["en"], { type: "region" }).of(candidate.countryCode) ?? candidate.countryCode,
      importedAt: candidate.importedAt.toISOString(),
    },
  };
}
