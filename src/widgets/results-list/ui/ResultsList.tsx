import { DestinationCard, type DestinationRecommendation } from "@/entities/destination";
import { getMatchLabel } from "@/features/destination-matching";

type ResultsListProps = {
  recommendations: DestinationRecommendation[];
};

export function ResultsList({ recommendations }: ResultsListProps) {
  if (recommendations.length === 0) {
    return <p className="rounded-2xl bg-secondary/20 p-6 text-text">No destination matches were found. Try adjusting your answers.</p>;
  }

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
          />
        );
      })}
    </section>
  );
}
