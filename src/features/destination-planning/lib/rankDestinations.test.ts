import type { ActivityAssessment } from "@/features/destination-activities/model/activityEvidence";
import { rankDestinations, type DiscoveryCandidate } from "./rankDestinations";

function assessment(activity: string, status: ActivityAssessment["status"]): ActivityAssessment {
  return { activity, status, reason: "unavailable", places: [], observation: null };
}

function candidate(id: string, name: string, statuses: ActivityAssessment["status"][]): DiscoveryCandidate {
  return {
    id,
    name,
    country: "Portugal",
    assessments: statuses.map((status, index) => assessment(["Museums", "Beaches", "Markets"][index], status)),
  };
}

it("ranks supported interests ahead of unknowns without turning gaps into matches", () => {
  const sparse = candidate("sparse", "Sparse", ["supported", "unknown", "unknown"]);
  const stronger = candidate("stronger", "Stronger", ["supported", "supported", "unknown"]);
  const unknown = candidate("unknown", "Unknown", ["unknown", "unknown", "unknown"]);
  expect(rankDestinations([sparse, unknown, stronger]).map((place) => place.id)).toEqual(["stronger", "sparse", "unknown"]);
  expect(rankDestinations([stronger])[0].assessments[2].status).toBe("unknown");
});

it("uses fewer explicit contradictions only after comparing support, keeping unknown destinations", () => {
  const conflict = candidate("conflict", "A conflict", ["supported", "contradicted", "unknown"]);
  const gap = candidate("gap", "Z gap", ["supported", "unknown", "unknown"]);
  const moreSupport = candidate("more", "More", ["supported", "supported", "contradicted"]);
  expect(rankDestinations([conflict, gap, moreSupport]).map((place) => place.id)).toEqual(["more", "gap", "conflict"]);
});

it("breaks evidence ties by name then ID, without mutating the input or using raw example counts", () => {
  const second = candidate("b", "Same", ["unknown"]);
  const first = candidate("a", "Same", ["unknown"]);
  const alphabetic = candidate("z", "Alpha", ["unknown"]);
  const input = [second, first, alphabetic];
  expect(rankDestinations(input).map((place) => place.id)).toEqual(["z", "a", "b"]);
  expect(input.map((place) => place.id)).toEqual(["b", "a", "z"]);
});
