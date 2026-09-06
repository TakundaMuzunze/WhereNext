import type { PlannerAnswers } from "@/entities/trip/model/types";
import { destinations } from "@/shared/data/destinations";
import { getRecommendations } from "./getRecommendations";

const answers: PlannerAnswers = {
  departure: "London",
  travelMonth: "June",
  duration: 5,
  budget: 2000,
  travellers: 2,
  tripType: "city-break",
  activities: ["Museums", "Architecture"],
};

describe("getRecommendations", () => {
  it("returns five recommendations sorted by score and then name", () => {
    const recommendations = getRecommendations(answers);
    expect(recommendations).toHaveLength(5);
    expect(recommendations).toEqual(
      [...recommendations].sort((first, second) => second.score - first.score || first.destination.name.localeCompare(second.destination.name)),
    );
  });

  it("normalises custom limits", () => {
    expect(getRecommendations(answers, 2.9)).toHaveLength(2);
    expect(getRecommendations(answers, -1)).toEqual([]);
    expect(getRecommendations(answers, Number.NaN)).toEqual([]);
    expect(getRecommendations(answers, destinations.length + 1)).toHaveLength(destinations.length);
  });
});
