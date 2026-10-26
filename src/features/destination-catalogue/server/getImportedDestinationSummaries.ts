import "server-only";

import { isImportedDestinationId, type DestinationSummary } from "@/entities/destination/model/importedDestination";
import { prisma } from "@/shared/lib/db/prisma";

export async function getImportedDestinationSummaries(destinationIds: string[]) {
  const importedIds = [...new Set(destinationIds.filter(isImportedDestinationId))];
  const summaries = new Map<string, DestinationSummary>();

  if (importedIds.length === 0) {
    return summaries;
  }

  const candidates = await prisma.destinationCandidate.findMany({
    where: { id: { in: importedIds } },
    select: { id: true, name: true, countryCode: true },
  });
  const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

  for (const candidate of candidates) {
    summaries.set(candidate.id, {
      id: candidate.id,
      name: candidate.name,
      country: countryNames.of(candidate.countryCode) ?? candidate.countryCode,
    });
  }

  return summaries;
}
