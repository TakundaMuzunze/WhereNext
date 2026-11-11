import { initialActivities } from "@/features/destination-activities/lib/activityCategories";
import { getDestinationActivities } from "@/features/destination-activities/server/getDestinationActivities";
import { resolveDestination } from "@/features/destination-catalogue/server/resolveDestination";
import { getMatchLabel, getRecommendations } from "@/features/destination-matching";
import { parseDiscoveryRequest, serializeDiscoveryRequest } from "@/features/destination-planning/lib/discoveryRequest";
import { getDestinationSeason } from "@/features/destination-seasons/server/getDestinationSeason";
import { parsePlannerAnswers, serializePlannerAnswers, type PlannerSearchParams } from "@/features/trip-planner";
import { parseDatedTripRequest, serializeDatedTripRequest } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { DatedTripReview } from "@/features/trip-planner/ui/DatedTripReview";
import { destinations } from "@/shared/data/destinations";
import { DestinationDetails } from "@/widgets/destination-details";
import { ImportedDestinationDetails } from "@/widgets/destination-details/ui/ImportedDestinationDetails";
import { notFound } from "next/navigation";

type DestinationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<PlannerSearchParams>;
};

export function generateStaticParams() {
  return destinations.map((destination) => ({ id: destination.id }));
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { id: encodedId } = await params;
  let id: string;

  try {
    id = decodeURIComponent(encodedId);
  } catch {
    notFound();
  }

  const resolved = await resolveDestination(id);

  if (!resolved) notFound();

  const queryParams = await searchParams;
  const selectedActivities =
    queryParams.kind === "discovery"
      ? parseDiscoveryRequest(queryParams)?.activities
      : (parseDatedTripRequest(queryParams)?.preferences.activities ?? parsePlannerAnswers(queryParams)?.activities);
  // Opening details reads stored evidence only. Explicit checks own live retrieval.
  const initialActivityResult = await getDestinationActivities(id, selectedActivities ?? initialActivities, true).catch(() => null);
  if (queryParams.kind === "discovery") {
    const request = parseDiscoveryRequest(queryParams);

    if (!request) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-28 text-text">
          <h1 className="text-3xl">Check your trip request</h1>
          <p className="mt-4">This destination link contains invalid discovery inputs. Return to the planner to update them.</p>
        </main>
      );
    }

    const query = serializeDiscoveryRequest(request);
    const seasonalGuidance = await getDestinationSeason(id, request);

    if (resolved.kind === "imported") {
      return (
        <ImportedDestinationDetails
          initialActivityResult={initialActivityResult}
          destination={resolved.destination}
          backHref={`/results?${query}`}
          activities={request.activities}
          discoveryRequest={request}
          seasonalGuidance={seasonalGuidance}
        />
      );
    }

    return (
      <DestinationDetails
        initialActivityResult={initialActivityResult}
        destination={resolved.destination}
        backHref={`/results?${query}`}
        backLabel="Back to destinations"
        activities={request.activities}
        discoveryRequest={request}
        seasonalGuidance={seasonalGuidance}
      />
    );
  }

  if (resolved.kind === "imported") {
    const seasonalGuidance = await getDestinationSeason(id);
    const datedRequest = parseDatedTripRequest(queryParams);
    const plannerAnswers = parsePlannerAnswers(queryParams);
    let query: string | undefined;

    if (datedRequest) {
      query = serializeDatedTripRequest(datedRequest);
    } else if (plannerAnswers) {
      query = serializePlannerAnswers(plannerAnswers);
    }

    return (
      <ImportedDestinationDetails
        initialActivityResult={initialActivityResult}
        destination={resolved.destination}
        seasonalGuidance={seasonalGuidance}
        backHref={query ? `/results?${query}` : undefined}
        editHref={query ? `/planner?${query}` : undefined}
        activities={datedRequest?.preferences.activities ?? plannerAnswers?.activities}
      />
    );
  }

  const destination = resolved.destination;

  if (queryParams.kind !== undefined) {
    const request = parseDatedTripRequest(queryParams);
    if (!request)
      return (
        <DestinationDetails
          initialActivityResult={initialActivityResult}
          destination={destination}
          backHref="/planner?kind=dated"
          backLabel="Start a dated request"
        />
      );
    return (
      <>
        <div className="mx-auto max-w-5xl px-6 pt-28">
          <DatedTripReview request={request} />
        </div>
        <DestinationDetails
          initialActivityResult={initialActivityResult}
          destination={destination}
          backHref={`/results?${serializeDatedTripRequest(request)}`}
          backLabel="Back to your trip request"
          activities={request.preferences.activities}
        />
      </>
    );
  }
  const answers = parsePlannerAnswers(queryParams);

  if (!answers) return <DestinationDetails initialActivityResult={initialActivityResult} destination={destination} />;

  const recommendations = getRecommendations(answers, destinations.length);
  const recommendationIndex = recommendations.findIndex((item) => item.destination.id === destination.id);
  const recommendation = recommendations[recommendationIndex];

  if (!recommendation) notFound();

  const query = serializePlannerAnswers(answers);
  const rank = recommendationIndex + 1;

  return (
    <DestinationDetails
      initialActivityResult={initialActivityResult}
      recommendation={recommendation}
      destination={destination}
      answers={answers}
      matchLabel={getMatchLabel(recommendation.score, rank)}
      backHref={`/results?${query}`}
      editHref={`/planner?${query}`}
    />
  );
}
