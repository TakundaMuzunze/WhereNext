import type { Destination } from "@/entities/destination/model/types";
import type { DestinationSummary } from "@/entities/destination/model/importedDestination";
import type { ActivityAssessment } from "@/features/destination-activities/model/activityEvidence";
import type { SeasonalGuidance } from "@/features/destination-seasons/lib/assessSeason";

export type DiscoveryCandidate = DestinationSummary & {
  assessments: ActivityAssessment[];
  guideImage?: Destination["image"];
  seasonalGuidance?: SeasonalGuidance;
};

function supportedInterests(candidate: DiscoveryCandidate): number {
  return candidate.assessments.filter((assessment) => assessment.status === "supported").length;
}

export function rankDestinations(candidates: DiscoveryCandidate[]): DiscoveryCandidate[] {
  return [...candidates].sort((first, second) => {
    const supportDifference = supportedInterests(second) - supportedInterests(first);

    if (supportDifference !== 0) {
      return supportDifference;
    }

    const firstContradictions = first.assessments.filter((assessment) => assessment.status === "contradicted").length;
    const secondContradictions = second.assessments.filter((assessment) => assessment.status === "contradicted").length;
    const contradictionDifference = firstContradictions - secondContradictions;

    if (contradictionDifference !== 0) {
      return contradictionDifference;
    }

    const firstSeason = first.seasonalGuidance?.ranking ?? { matched: 0, tradeOffs: 0 };
    const secondSeason = second.seasonalGuidance?.ranking ?? { matched: 0, tradeOffs: 0 };
    const seasonalMatchDifference = secondSeason.matched - firstSeason.matched;

    if (seasonalMatchDifference !== 0) {
      return seasonalMatchDifference;
    }

    const seasonalTradeOffDifference = firstSeason.tradeOffs - secondSeason.tradeOffs;

    if (seasonalTradeOffDifference !== 0) {
      return seasonalTradeOffDifference;
    }

    const nameDifference = first.name.localeCompare(second.name, "en");

    if (nameDifference !== 0) {
      return nameDifference;
    }

    return first.id.localeCompare(second.id, "en");
  });
}
