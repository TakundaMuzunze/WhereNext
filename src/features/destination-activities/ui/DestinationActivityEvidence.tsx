"use client";

import { useEffect, useRef, useState } from "react";
import { initialActivities } from "../lib/activityCategories";
import { activityResultSchema, type ActivityAssessment, type ActivityResult } from "../model/activityEvidence";

const explanations: Record<ActivityAssessment["reason"], string> = {
  named_places: "Named places in the checked area support this interest. Date-specific access and opening are not verified.",
  no_places: "No usable examples were found in this bounded search. This does not mean the activity is absent.",
  incomplete_evidence: "The source sample is capped or incomplete. Available examples are shown, but fit remains unknown.",
  unavailable: "Evidence could not be checked. You can try again without changing your saved places.",
  unsupported_interest: "We do not yet have a reliable evidence rule for this interest.",
  location_unknown: "A single catalogue location is not available for this guide. We have not substituted its airport or guessed a centre.",
  stale_evidence: "The earlier evidence has expired and could not be refreshed. These older examples are context, not current support.",
};

const statusLabels: Record<ActivityAssessment["status"], string> = {
  supported: "evidence found nearby",
  contradicted: "conflicting evidence",
  unknown: "unknown",
};

type DestinationActivityEvidenceProps = {
  destinationId: string;
  activities?: string[];
};

export function DestinationActivityEvidence({ destinationId, activities = initialActivities }: DestinationActivityEvidenceProps) {
  const [activityResult, setActivityResult] = useState<ActivityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  async function checkActivities() {
    const trimmedActivities = activities.map((activity) => activity.trim());
    const requestedActivities = [...new Set(trimmedActivities)];
    const requestController = new AbortController();

    requestControllerRef.current = requestController;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const encodedDestinationId = encodeURIComponent(destinationId);
      const response = await fetch(`/api/destinations/${encodedDestinationId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities: requestedActivities }),
        cache: "no-store",
        signal: requestController.signal,
      });

      if (response.status === 429) {
        throw new Error("Too many activity checks. Please wait a minute before trying again.");
      }

      if (!response.ok) {
        throw new Error("Activity evidence could not be loaded. Please try again.");
      }

      const responseBody = await response.json();
      const parsedResult = activityResultSchema.parse(responseBody);
      const matchesDestination = parsedResult.destinationId === destinationId;
      const hasExpectedActivityCount = parsedResult.assessments.length === requestedActivities.length;
      const hasExpectedActivities = parsedResult.assessments.every((assessment, index) => {
        return assessment.activity === requestedActivities[index];
      });

      if (!matchesDestination || !hasExpectedActivityCount || !hasExpectedActivities) {
        throw new Error("The activity evidence did not match this request. Please try again.");
      }

      if (!requestController.signal.aborted) {
        setActivityResult(parsedResult);
      }
    } catch (cause: unknown) {
      if (!requestController.signal.aborted) {
        let message = "Activity evidence is unavailable.";

        if (cause instanceof Error) {
          message = cause.message;
        }

        setErrorMessage(message);
      }
    } finally {
      if (!requestController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }

  let checkButtonLabel = "Check nearby activity evidence";

  if (activityResult) {
    checkButtonLabel = "Check activity evidence again";
  }

  if (isLoading) {
    checkButtonLabel = "Checking activity evidence…";
  }

  return (
    <section className="my-8 rounded-2xl border border-border p-6" aria-labelledby={`activity-evidence-${destinationId}`}>
      <h3 id={`activity-evidence-${destinationId}`} className="text-xl font-semibold">
        Activity fit
      </h3>

      {!activityResult && <p className="mt-3 text-sm text-muted">Unknown - nearby activity evidence has not been checked.</p>}

      <p className="mt-3 text-sm leading-6 text-muted">
        Check named places within 4 km of the recorded destination centre. This is a bounded nearby sample, not a complete guide or a rating. Evidence
        is reused for up to seven days, independently of travel dates and prices.
      </p>

      <button
        className="mt-4 min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        disabled={isLoading}
        onClick={() => void checkActivities()}
      >
        {checkButtonLabel}
      </button>

      {isLoading && (
        <p role="status" className="mt-3 text-sm">
          Checking the requested interests…
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {activityResult && "The latest check failed. Showing previous evidence with its original retrieval times. "}
          {errorMessage}
        </p>
      )}

      {activityResult && (
        <ul className="mt-6 space-y-5" aria-label="Activity assessments">
          {activityResult.assessments.map((assessment) => (
            <ActivityAssessmentItem key={assessment.activity} assessment={assessment} />
          ))}
        </ul>
      )}

      <p className="mt-5 text-xs leading-5 text-muted">
        Straight-line distance is not travel time. Listings may describe the same real-world place, and opening, access, quality and safe swimming
        remain unverified. Sources:{" "}
        <a className="underline" href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
          Geoapify
        </a>{" "}
        and{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
        .
      </p>
    </section>
  );
}

function ActivityAssessmentItem({ assessment }: { assessment: ActivityAssessment }) {
  let activityLabel = assessment.activity;

  if (activityLabel === "Clubs") {
    activityLabel = "Nightclubs";
  }

  const statusLabel = statusLabels[assessment.status];
  const examples = assessment.places.slice(0, 3);
  const observation = assessment.observation;
  let retrievalDescription: string | null = null;

  if (observation) {
    const retrievedAt = new Date(observation.retrievedAt);
    const formattedTime = retrievedAt.toLocaleString("en-GB", { timeZone: "UTC" });
    const radiusKilometres = observation.radiusMetres / 1000;

    retrievalDescription = `Retrieved ${formattedTime} UTC · Search radius ${radiusKilometres} km.`;
  }

  return (
    <li className="rounded-xl bg-secondary p-4">
      <h4 className="font-semibold">
        {activityLabel}: {statusLabel}
      </h4>

      <p className="mt-2 text-sm leading-6 text-muted">{explanations[assessment.reason]}</p>

      {examples.length > 0 && (
        <ul className="mt-3 space-y-2">
          {examples.map((place) => (
            <li key={place.sourceId}>
              <a className="text-sm text-primary underline" href={place.sourceUrl} target="_blank" rel="noreferrer">
                {place.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {retrievalDescription && <p className="mt-3 text-xs leading-5 text-muted">{retrievalDescription}</p>}
    </li>
  );
}
