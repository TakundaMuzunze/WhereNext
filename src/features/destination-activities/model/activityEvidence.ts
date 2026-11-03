import { z } from "zod";

export const activityPlaceSchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
  categories: z.array(z.string()),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sourceUrl: z.url().startsWith("https://www.openstreetmap.org/"),
  access: z.enum(["unknown", "restricted", "closed"]).default("unknown"),
});

export const activityObservationSchema = z.object({
  destinationId: z.string().min(1),
  category: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMetres: z.number().int().positive().max(4000),
  limit: z.literal(20),
  retrievedAt: z.iso.datetime(),
  coverage: z.enum(["sample", "incomplete"]),
  places: z.array(activityPlaceSchema).max(20),
});

export const activityAssessmentSchema = z.object({
  activity: z.string(),
  status: z.enum(["supported", "contradicted", "unknown"]),
  reason: z.enum(["named_places", "no_places", "incomplete_evidence", "unavailable", "unsupported_interest", "location_unknown", "stale_evidence"]),
  places: z.array(activityPlaceSchema),
  observation: activityObservationSchema.nullable(),
});

export const activityResultSchema = z.object({
  destinationId: z.string(),
  assessments: z.array(activityAssessmentSchema),
});

export type ActivityPlace = z.infer<typeof activityPlaceSchema>;
export type ActivityObservation = z.infer<typeof activityObservationSchema>;
export type ActivityAssessment = z.infer<typeof activityAssessmentSchema>;
export type ActivityResult = z.infer<typeof activityResultSchema>;
