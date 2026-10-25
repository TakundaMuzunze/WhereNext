import "server-only";

import { prisma } from "@/shared/lib/db/prisma";
import { z } from "zod";

const destinationIdSchema = z
  .string()
  .max(128)
  .regex(/^wikidata:Q[1-9]\d*$/);

const cataloguePageSchema = z.strictObject({
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  limit: z.number().int().min(1).max(100).default(50),
  afterId: destinationIdSchema.optional(),
});

export async function listDestinationCandidates(input: unknown = {}) {
  const options = cataloguePageSchema.parse(input);

  const storedCandidates = await prisma.destinationCandidate.findMany({
    where: {
      countryCode: options.countryCode,
      id: options.afterId ? { gt: options.afterId } : undefined,
    },
    orderBy: { id: "asc" },
    take: options.limit + 1,
  });

  const candidates = storedCandidates.slice(0, options.limit);
  const hasAnotherPage = storedCandidates.length > options.limit;
  let nextAfterId: string | null = null;

  if (hasAnotherPage) {
    nextAfterId = candidates[candidates.length - 1].id;
  }

  return { candidates, nextAfterId };
}

export async function getDestinationCandidate(input: unknown) {
  const destinationId = destinationIdSchema.parse(input);

  return prisma.destinationCandidate.findUnique({
    where: { id: destinationId },
  });
}
