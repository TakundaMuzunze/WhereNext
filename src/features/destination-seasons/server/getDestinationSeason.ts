import { resolveActivityLocation } from "@/features/destination-activities/server/resolveActivityLocation";
import type { DiscoveryRequest } from "@/features/destination-planning/model/discoveryRequest";
import { assessSeason } from "../lib/assessSeason";
import { climateLocation } from "../model/climateObservation";
import { readClimate } from "../server/readClimate";

export async function getDestinationSeason(destinationId: string, request?: DiscoveryRequest) {
  const timing = request?.timing ?? { kind: "flexible" };
  const activities = request?.activities ?? [];
  let observation = null;

  try {
    // Reuse the verified catalogue/legacy identity geography, never an airport location.
    const resolved = await resolveActivityLocation(destinationId);
    if (resolved?.location) {
      const climate = await readClimate([resolved.location]);
      const key = climateLocation(resolved.location.latitude, resolved.location.longitude).requestKey;
      observation = climate.get(key) ?? null;
    }
  } catch (error) {
    // Optional climate data must not hide a destination or its saving controls.
    const errorName = error instanceof Error ? error.name : "unknown";
    console.warn(`[seasonal-guidance] Destination climate lookup failed (${errorName}); showing unknown guidance.`);
  }

  return assessSeason(observation, timing, activities);
}
