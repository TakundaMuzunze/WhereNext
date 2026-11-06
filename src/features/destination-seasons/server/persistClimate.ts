import type { Pool } from "pg";
import { climateLocation, climateObservationSchema } from "../model/climateObservation.ts";

export async function persistClimate(pool: Pool, input: unknown): Promise<void> {
  const observation = climateObservationSchema.parse(input);
  const location = climateLocation(observation.latitude, observation.longitude);

  if (location.latitude !== observation.latitude || location.longitude !== observation.longitude) {
    throw new Error("Climate observations must refer to a source grid cell.");
  }

  await pool.query(
    `INSERT INTO "SeasonalClimate" ("requestKey", "observation", "retrievedAt") VALUES ($1, $2::jsonb, $3)
     ON CONFLICT ("requestKey") DO UPDATE SET "observation" = EXCLUDED."observation", "retrievedAt" = EXCLUDED."retrievedAt"`,
    [location.requestKey, JSON.stringify(observation), new Date(observation.retrievedAt)],
  );
}
