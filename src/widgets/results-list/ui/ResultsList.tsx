import { DestinationCard, type DestinationRecommendation } from "@/entities/destination";
import type { PlannerAnswers } from "@/entities/trip/model/types";
import { getMatchLabel } from "@/features/destination-matching";
import { serializePlannerAnswers } from "@/features/trip-planner";

type ResultsListProps = {
  recommendations: DestinationRecommendation[];
  answers: PlannerAnswers;
};

export function ResultsList({ recommendations, answers }: ResultsListProps) {
  if (recommendations.length === 0) {
    return <p className="rounded-2xl bg-secondary/20 p-6 text-text">No destination matches were found. Try adjusting your answers.</p>;
  }

  const plannerQuery = serializePlannerAnswers(answers);

  return (
    <section aria-label="Destination matches" className="grid gap-6">
      {recommendations.map((recommendation, index) => {
        const rank = index + 1;

        return (
          <DestinationCard
            key={recommendation.destination.id}
            recommendation={recommendation}
            rank={rank}
            matchLabel={getMatchLabel(recommendation.score, rank)}
            detailsHref={`/destinations/${recommendation.destination.id}?${plannerQuery}`}
          />
        );
      })}
    </section>
  );
}
