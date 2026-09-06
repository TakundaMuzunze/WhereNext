import type { Destination } from "@/entities/destination";
import type { PlannerAnswers } from "@/entities/trip/model/types";
import { scoreDestination } from "./scoreDestination";

const destination: Destination = {
  id: "test",
  name: "Test City",
  country: "Testland",
  description: "Test destination",
  estimatedCostPerPerson: 500,
  costLevel: "mid-range",
  bestMonths: ["June"],
  tripTypes: ["city-break"],
  activities: ["Museums", "Food markets"],
  recommendedDuration: { min: 4, max: 7 },
};

const answers: PlannerAnswers = {
  departure: "London",
  travelMonth: "june",
  duration: 5,
  budget: 1000,
  travellers: 2,
  tripType: "city-break",
  activities: ["museums", "Food markets"],
};

function score(changes: Partial<PlannerAnswers> = {}, destinationChanges: Partial<Destination> = {}) {
  return scoreDestination({ ...destination, ...destinationChanges }, { ...answers, ...changes });
}

describe("scoreDestination", () => {
  it("awards a perfect score and explains every match", () => {
    expect(score()).toMatchObject({
      score: 100,
      breakdown: { budget: 25, travelMonth: 20, tripType: 25, activities: 20, duration: 10 },
      reasons: ["Fits your budget", "Great in june", "Matches your chosen trip style", "Includes museums, Food markets", "Suits your trip length"],
    });
  });

  it.each([
    [870, 18],
    [770, 10],
    [700, 0],
  ])("scores a £%i budget", (budget, expected) => {
    expect(score({ budget }).breakdown.budget).toBe(expected);
  });

  it("handles missing budget inputs", () => {
    expect(score({ budget: "" }).breakdown.budget).toBe(0);
    expect(score({ travellers: "" }).breakdown.budget).toBe(0);
  });

  it("scores unmatched and missing preferences", () => {
    expect(score({ travelMonth: " " }).breakdown.travelMonth).toBe(0);
    expect(score({ travelMonth: "July" }).breakdown.travelMonth).toBe(0);
    expect(score({ tripType: "" }).breakdown.tripType).toBe(0);
    expect(score({ tripType: "foodie" }).breakdown.tripType).toBe(0);
    expect(score({ activities: [] }).breakdown.activities).toBe(0);
    expect(score({ activities: ["Museums", "Hiking"] }).breakdown.activities).toBe(10);
    expect(score({ activities: ["Hiking"] }).breakdown.activities).toBe(0);
  });

  it("scores exact, near, distant and missing durations", () => {
    expect(score({ duration: "" }).breakdown.duration).toBe(0);
    expect(score({ duration: 3 }).breakdown.duration).toBe(5);
    expect(score({ duration: 8 }).breakdown.duration).toBe(5);
    expect(score({ duration: 2 }).breakdown.duration).toBe(0);
  });

  it("explains near matches and omits non-matches", () => {
    expect(score({ budget: 870, duration: 3, travelMonth: "July", tripType: "foodie", activities: ["Hiking"] }).reasons).toEqual([
      "Close to your preferred budget",
      "Works with a small adjustment to your trip length",
    ]);
    expect(score({ budget: 700, duration: 2, travelMonth: "July", tripType: "foodie", activities: ["Hiking"] }).reasons).toEqual([]);
  });
});
