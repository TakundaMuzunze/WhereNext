import { climateLocation, climateObservationSchema, type ClimateObservation } from "./climateObservation.ts";

export function reusableClimate(row: { requestKey: string; observation: unknown; retrievedAt: Date }, now = Date.now()): ClimateObservation | null {
  const validation = climateObservationSchema.safeParse(row.observation);

  if (!validation.success) {
    return null;
  }

  const observation = validation.data;
  const location = climateLocation(observation.latitude, observation.longitude);
  const retrievedAt = Date.parse(observation.retrievedAt);
  const maximumAgeMs = 365 * 24 * 60 * 60 * 1000;
  const matchesRecord = location.requestKey === row.requestKey && retrievedAt === row.retrievedAt.getTime();
  const isCurrent = retrievedAt <= now && now - retrievedAt < maximumAgeMs;
  const isSourceGridCell = location.latitude === observation.latitude && location.longitude === observation.longitude;

  return matchesRecord && isCurrent && isSourceGridCell ? observation : null;
}
