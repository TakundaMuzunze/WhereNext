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
  const { id } = await params;
  const destination = destinations.find((item) => item.id === id);

  if (!destination) notFound();

  const answers = parsePlannerAnswers(await searchParams);

  if (!answers) return <DestinationDetails destination={destination} />;

  const recommendations = getRecommendations(answers, destinations.length);
  const recommendationIndex = recommendations.findIndex((item) => item.destination.id === id);
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
