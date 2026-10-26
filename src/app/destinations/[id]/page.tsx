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
