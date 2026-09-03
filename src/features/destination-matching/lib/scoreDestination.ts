import type { Destination, DestinationRecommendation, DestinationScoreBreakdown } from "@/entities/destination";
import type { PlannerAnswers } from "@/entities/trip/model/types";

const scoreWeights: DestinationScoreBreakdown = {
  budget: 25,
  travelMonth: 20,
  tripType: 25,
  activities: 20,
  duration: 10,
};

function scoreBudget(destination: Destination, answers: PlannerAnswers): number {
  if (answers.budget === "" || answers.travellers === "") return 0;

  const estimatedTotal = destination.estimatedCostPerPerson * answers.travellers;
  const budgetRatio = estimatedTotal / answers.budget;

  if (budgetRatio <= 1) return scoreWeights.budget;
  if (budgetRatio <= 1.15) return 18;
  if (budgetRatio <= 1.3) return 10;
  return 0;
}

function scoreTravelMonth(destination: Destination, answers: PlannerAnswers): number {
  const requestedMonth = answers.travelMonth.trim().toLowerCase();
  if (!requestedMonth) return 0;

  const isBestMonth = destination.bestMonths.some((month) => month.toLowerCase() === requestedMonth);
  return isBestMonth ? scoreWeights.travelMonth : 0;
}

function scoreTripType(destination: Destination, answers: PlannerAnswers): number {
  if (!answers.tripType) return 0;
  return destination.tripTypes.includes(answers.tripType) ? scoreWeights.tripType : 0;
}

function getMatchingActivities(destination: Destination, answers: PlannerAnswers): string[] {
  const destinationActivities = new Set(destination.activities.map((activity) => activity.toLowerCase()));
  return answers.activities.filter((activity) => destinationActivities.has(activity.toLowerCase()));
}

function scoreActivities(destination: Destination, answers: PlannerAnswers): number {
  if (answers.activities.length === 0) return 0;

  const matchingActivities = getMatchingActivities(destination, answers);
  return Math.round((matchingActivities.length / answers.activities.length) * scoreWeights.activities);
}

function scoreDuration(destination: Destination, answers: PlannerAnswers): number {
  if (answers.duration === "") return 0;

  const { min, max } = destination.recommendedDuration;
  if (answers.duration >= min && answers.duration <= max) return scoreWeights.duration;
  if (answers.duration === min - 1 || answers.duration === max + 1) return 5;
  return 0;
}

function buildReasons(destination: Destination, answers: PlannerAnswers, breakdown: DestinationScoreBreakdown): string[] {
  const reasons: string[] = [];
  const matchingActivities = getMatchingActivities(destination, answers);

  if (breakdown.budget === scoreWeights.budget) reasons.push("Fits within your total trip budget");
  else if (breakdown.budget > 0) reasons.push("Close to your preferred budget");

  if (breakdown.travelMonth > 0) reasons.push(`${answers.travelMonth} is one of the best months to visit`);
  if (breakdown.tripType > 0) reasons.push("Matches your chosen trip style");
  if (matchingActivities.length > 0) reasons.push(`Includes ${matchingActivities.slice(0, 3).join(", ")}`);
  if (breakdown.duration === scoreWeights.duration) reasons.push("Well suited to your trip length");
  else if (breakdown.duration > 0) reasons.push("Works with a small adjustment to your trip length");

  return reasons;
}

export function scoreDestination(destination: Destination, answers: PlannerAnswers): DestinationRecommendation {
  const breakdown: DestinationScoreBreakdown = {
    budget: scoreBudget(destination, answers),
    travelMonth: scoreTravelMonth(destination, answers),
    tripType: scoreTripType(destination, answers),
    activities: scoreActivities(destination, answers),
    duration: scoreDuration(destination, answers),
  };

  const score = Object.values(breakdown).reduce((total, categoryScore) => total + categoryScore, 0);

  return {
    destination,
    score,
    breakdown,
    reasons: buildReasons(destination, answers, breakdown),
  };
}
