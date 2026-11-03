import { parseDiscoveryRequest, serializeDiscoveryRequest } from "@/features/destination-planning/lib/discoveryRequest";
import { resolveDestination } from "@/features/destination-catalogue/server/resolveDestination";
import { ImportedDestinationDetails } from "@/widgets/destination-details/ui/ImportedDestinationDetails";
import { DatedTripReview } from "@/features/trip-planner/ui/DatedTripReview";
import { parseDatedTripRequest, serializeDatedTripRequest } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { getMatchLabel, getRecommendations } from "@/features/destination-matching";
import { parsePlannerAnswers, serializePlannerAnswers, type PlannerSearchParams } from "@/features/trip-planner";
import { destinations } from "@/shared/data/destinations";
import { DestinationDetails } from "@/widgets/destination-details";
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

    if (resolved.kind === "imported") {
      return (
        <ImportedDestinationDetails
          destination={resolved.destination}
          backHref={`/results?${query}`}
          activities={request.activities}
          discoveryRequest={request}
        />
      );
    }

    return (
      <DestinationDetails
        destination={resolved.destination}
        backHref={`/results?${query}`}
        backLabel="Back to destinations"
        activities={request.activities}
        discoveryRequest={request}
      />
    );
  }

  if (resolved.kind === "imported") {
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
        destination={resolved.destination}
        backHref={query ? `/results?${query}` : undefined}
        editHref={query ? `/planner?${query}` : undefined}
        activities={datedRequest?.preferences.activities ?? plannerAnswers?.activities}
      />
    );
  }

  const destination = resolved.destination;

  if (queryParams.kind !== undefined) {
    const request = parseDatedTripRequest(queryParams);
    if (!request) return <DestinationDetails destination={destination} backHref="/planner?kind=dated" backLabel="Start a dated request" />;
    return (
      <>
        <div className="mx-auto max-w-5xl px-6 pt-28">
          <DatedTripReview request={request} />
        </div>
        <DestinationDetails
          destination={destination}
          backHref={`/results?${serializeDatedTripRequest(request)}`}
          backLabel="Back to your trip request"
          activities={request.preferences.activities}
        />
      </>
    );
  }
  const answers = parsePlannerAnswers(queryParams);

  if (!answers) return <DestinationDetails destination={destination} />;

  const recommendations = getRecommendations(answers, destinations.length);
  const recommendationIndex = recommendations.findIndex((item) => item.destination.id === destination.id);
  const recommendation = recommendations[recommendationIndex];

  if (!recommendation) notFound();

  const query = serializePlannerAnswers(answers);
  const rank = recommendationIndex + 1;

  return (
    <DestinationDetails
      recommendation={recommendation}
      destination={destination}
      answers={answers}
      matchLabel={getMatchLabel(recommendation.score, rank)}
      backHref={`/results?${query}`}
      editHref={`/planner?${query}`}
    />
  );
}
