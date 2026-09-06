import type { PlannerAnswers } from "@/entities/trip/model/types";
import { parsePlannerAnswers, serializePlannerAnswers } from "./plannerSearchParams";

const answers: PlannerAnswers = {
  departure: "London",
  travelMonth: "June",
  duration: 5,
  budget: 2000,
  travellers: 2,
  tripType: "city-break",
  activities: ["Museums", "Food markets"],
};

describe("planner search params", () => {
  it("round-trips planner answers", () => {
    const query = serializePlannerAnswers(answers);
    const params = Object.fromEntries(new URLSearchParams(query));
    params.activity = new URLSearchParams(query).getAll("activity") as never;
    expect(parsePlannerAnswers(params)).toEqual(answers);
  });

  it("accepts a single activity and the first repeated scalar", () => {
    expect(
      parsePlannerAnswers({
        departure: ["London", "Paris"],
        month: "June",
        duration: "5",
        budget: "2000",
        travellers: "2",
        tripType: "city-break",
        activity: "Museums",
      }),
    ).toEqual({ ...answers, activities: ["Museums"] });
  });

  it.each([
    { departure: undefined },
    { departure: [] },
    { month: undefined },
    { duration: "0" },
    { duration: "nope" },
    { budget: undefined },
    { travellers: undefined },
    { tripType: "invalid" },
    { activity: undefined },
    { activity: [" "] },
  ])("rejects incomplete or invalid params", (change) => {
    const valid = {
      departure: "London",
      month: "June",
      duration: "5",
      budget: "2000",
      travellers: "2",
      tripType: "city-break",
      activity: ["Museums"],
    };
    expect(parsePlannerAnswers({ ...valid, ...change })).toBeNull();
  });
});
