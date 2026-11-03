import "server-only";

import { activityCategory } from "../lib/activityCategories";
import { assessActivity, unknownActivity } from "../lib/assessActivity";
import type { ActivityAssessment, ActivityResult } from "../model/activityEvidence";
import { resolveActivityLocation } from "./resolveActivityLocation";
import { readActivityObservation } from "./readActivityObservation";

export async function getDestinationActivities(destinationId: string, activities: string[]): Promise<ActivityResult | null> {
  const resolvedDestination = await resolveActivityLocation(destinationId);

  if (!resolvedDestination) {
    return null;
  }

  const requestedActivities = [...new Set(activities)];
  const assessments: ActivityAssessment[] = [];

  for (const activity of requestedActivities) {
    const category = activityCategory(activity);

    if (!category) {
      assessments.push(unknownActivity(activity, "unsupported_interest"));
      continue;
    }

    const location = resolvedDestination.location;

    if (!location) {
      assessments.push(unknownActivity(activity, "location_unknown"));
      continue;
    }

    const observationResult = await readActivityObservation(location, category);
    const observation = observationResult.observation;

    if (!observation) {
      assessments.push(unknownActivity(activity, "unavailable"));
      continue;
    }

    if (observationResult.stale) {
      assessments.push(unknownActivity(activity, "stale_evidence", observation));
      continue;
    }

    assessments.push(assessActivity(activity, observation));
  }

  return {
    destinationId: resolvedDestination.destinationId,
    assessments,
  };
}
