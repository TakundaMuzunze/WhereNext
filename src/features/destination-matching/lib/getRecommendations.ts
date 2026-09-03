import type { DestinationRecommendation } from "@/entities/destination";
import type { PlannerAnswers } from "@/entities/trip/model/types";
import { destinations } from "@/shared/data/destinations";
import { scoreDestination } from "./scoreDestination";

const defaultRecommendationLimit = 5;

export function getRecommendations(answers: PlannerAnswers, limit = defaultRecommendationLimit): DestinationRecommendation[] {
  const safeLimit = Math.max(0, Math.floor(limit));

  return destinations
    .map((destination) => scoreDestination(destination, answers))
    .sort((first, second) => second.score - first.score || first.destination.name.localeCompare(second.destination.name))
    .slice(0, safeLimit);
}
