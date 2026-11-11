import type { ActivityAssessment } from "../model/activityEvidence";

const unknownLabels: Record<ActivityAssessment["reason"], string> = {
  named_places: "fit uncertain",
  no_places: "no examples found",
  incomplete_evidence: "fit uncertain",
  stale_evidence: "refresh needed",
  unavailable: "evidence pending",
  unsupported_interest: "not assessed yet",
  location_unknown: "location unverified",
};

export function activityEvidenceLabel(assessment: ActivityAssessment): string {
  if (assessment.status === "supported") return "evidence found nearby";
  if (assessment.status === "contradicted") return "conflicting evidence";
  return unknownLabels[assessment.reason];
}
