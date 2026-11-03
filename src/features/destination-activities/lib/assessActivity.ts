import type { ActivityAssessment, ActivityObservation, ActivityPlace } from "../model/activityEvidence";
import { distanceMetres } from "./distanceMetres";
import { activityCategory } from "./activityCategories";

function eligiblePlaces(observation: ActivityObservation): ActivityPlace[] {
  const examples: ActivityPlace[] = [];
  const previousNearbyPlaces: ActivityPlace[] = [];

  for (const place of observation.places) {
    const matchesCategory = place.categories.includes(observation.category);
    const hasNoKnownAccessConflict = place.access === "unknown";
    const distanceFromCentre = distanceMetres(observation.latitude, observation.longitude, place.latitude, place.longitude);
    const isWithinSearchArea = distanceFromCentre <= observation.radiusMetres;

    if (!matchesCategory || !hasNoKnownAccessConflict || !isWithinSearchArea) {
      continue;
    }

    const normalisedName = place.name.normalize("NFKC").toLowerCase();

    // Keep likely node/area duplicates out of examples. Both source records remain in the observation.
    const isLikelyDuplicate = previousNearbyPlaces.some((existingPlace) => {
      const existingName = existingPlace.name.normalize("NFKC").toLowerCase();
      const distanceBetweenPlaces = distanceMetres(existingPlace.latitude, existingPlace.longitude, place.latitude, place.longitude);

      return existingName === normalisedName && distanceBetweenPlaces <= 50;
    });

    previousNearbyPlaces.push(place);

    if (!isLikelyDuplicate) {
      examples.push(place);
    }
  }

  return examples;
}

export function unknownActivity(
  activity: string,
  reason: ActivityAssessment["reason"],
  observation: ActivityObservation | null = null,
): ActivityAssessment {
  let places: ActivityPlace[] = [];
  const expectedCategory = activityCategory(activity);

  if (observation && observation.category === expectedCategory) {
    places = eligiblePlaces(observation);
  }

  return {
    activity,
    status: "unknown",
    reason,
    places,
    observation,
  };
}

export function assessActivity(activity: string, observation: ActivityObservation): ActivityAssessment {
  const category = activityCategory(activity);

  if (!category) {
    return unknownActivity(activity, "unsupported_interest");
  }

  const hasIncompleteCoverage = observation.coverage === "incomplete";
  const hasDifferentCategory = observation.category !== category;

  if (hasIncompleteCoverage || hasDifferentCategory) {
    return unknownActivity(activity, "incomplete_evidence", observation);
  }

  const places = eligiblePlaces(observation);

  if (places.length === 0) {
    return unknownActivity(activity, "no_places", observation);
  }

  return {
    activity,
    status: "supported",
    reason: "named_places",
    places,
    observation,
  };
}
