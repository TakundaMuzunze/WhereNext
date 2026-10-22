import type { DatedTripRequest } from "@/entities/trip/model/datedTripRequestSchema";
import type { DiscoveryRecommendation } from "../model/discovery";

// Prefer options that leave room for a stay, then supported activities, then cost.
// This is an ordering of incomplete estimates, not a whole-holiday match score.
export function rankDiscovery(options: DiscoveryRecommendation[]): DiscoveryRecommendation[] {
  const supported = (option: DiscoveryRecommendation) => option.evidence.filter(({ status }) => status === "supported").length;
  return [...options].sort(
    (a, b) =>
      Number(b.remainingForStayPence > 0) - Number(a.remainingForStayPence > 0) ||
      supported(b) - supported(a) ||
      a.estimatedGroupFlightsPence - b.estimatedGroupFlightsPence ||
      a.id.localeCompare(b.id),
  );
}

export function estimateDiscoveryCosts(perAdultPence: number, trip: DatedTripRequest) {
  const nights = (Date.parse(trip.returnDate) - Date.parse(trip.outboundDate)) / 86_400_000;
  const estimatedGroupFlightsPence = perAdultPence * trip.adultCount;
  const spendingPence = trip.dailyAllowancePerPersonPence * (nights + 1) * trip.adultCount;
  return {
    estimatedGroupFlightsPence,
    spendingPence,
    remainingForStayPence: trip.groupBudgetPence - estimatedGroupFlightsPence - spendingPence,
  };
}
