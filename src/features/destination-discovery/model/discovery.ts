import { z } from "zod";

export const evidenceSchema = z.object({
  activity: z.string(),
  status: z.enum(["supported", "unknown"]),
  places: z.array(z.object({ name: z.string(), sourceUrl: z.url() })),
});

export const recommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  airport: z.string(),
  geonamesId: z.number().int().positive().nullable(),
  evidence: z.array(evidenceSchema),
  flightPerAdultPence: z.number().int().nonnegative(),
  estimatedGroupFlightsPence: z.number().int().nonnegative(),
  spendingPence: z.number().int().nonnegative(),
  remainingForStayPence: z.number().int(),
  onwardUrl: z.url(),
  retrievedAt: z.iso.datetime(),
  stops: z.number().int().nonnegative(),
});

export const discoveryResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), recommendations: z.array(recommendationSchema), partial: z.boolean() }),
  z.object({ status: z.enum(["empty", "unavailable", "invalid_request", "provider_failure"]) }),
]);

export type ActivityEvidence = z.infer<typeof evidenceSchema>;
export type DiscoveryRecommendation = z.infer<typeof recommendationSchema>;
export type DiscoveryResult = z.infer<typeof discoveryResultSchema>;
