import "server-only";
import { prisma } from "@/shared/lib/db/prisma";
import { climateLocation, type ClimateObservation } from "../model/climateObservation";
import { reusableClimate } from "../model/storedClimate";

type Location = { latitude: number; longitude: number };

export async function readClimate(locations: Location[]): Promise<Map<string, ClimateObservation>> {
  const requestKeys = [...new Set(locations.map((location) => climateLocation(location.latitude, location.longitude).requestKey))];
  const observations = new Map<string, ClimateObservation>();

  if (requestKeys.length === 0) {
    return observations;
  }

  try {
    const rows = await prisma.seasonalClimate.findMany({ where: { requestKey: { in: requestKeys } } });
    const now = Date.now();

    for (const row of rows) {
      const observation = reusableClimate(row, now);

      if (observation) {
        observations.set(row.requestKey, observation);
      }
    }
  } catch (error) {
    // Missing storage/migration must not make catalogue discovery unavailable.
    const errorName = error instanceof Error ? error.name : "unknown";
    console.warn(`[seasonal-guidance] Stored climate read failed (${errorName}); continuing without climate evidence.`);
  }

  return observations;
}
