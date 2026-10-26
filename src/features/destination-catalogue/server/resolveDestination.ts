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

  return {
    kind: "imported",
    destination: {
      ...candidate,
      country: new Intl.DisplayNames(["en"], { type: "region" }).of(candidate.countryCode) ?? candidate.countryCode,
      importedAt: candidate.importedAt.toISOString(),
    },
  };
}
