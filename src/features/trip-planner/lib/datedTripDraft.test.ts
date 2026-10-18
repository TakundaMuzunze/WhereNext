import { parseDatedTripDraft, serializeDatedTripDraft, type DatedTripDraft } from "./datedTripDraft";
import { parseDatedTripRequest } from "./datedPlannerSearchParams";
import type { PlannerSearchParams } from "./plannerSearchParams";

const draft: DatedTripDraft = {
  departureAirportCode: "MAN",
  outboundDate: "2026-11-10",
  returnDate: "",
  adultCount: "2.5",
  budget: "",
  allowance: "0",
  tripType: "city-break",
  activities: ["Museums", "Architecture"],
};

function draftParams(value = draft): PlannerSearchParams {
  const searchParams = new URLSearchParams(serializeDatedTripDraft(value));
  const params: PlannerSearchParams = {};

  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    params[key] = values.length === 1 ? values[0] : values;
  }

  return params;
}

describe("dated trip drafts", () => {
  it("round trips incomplete and invalid editable values without completing a request", () => {
    const params = draftParams();
    expect(parseDatedTripDraft(params)).toEqual(draft);
    expect(parseDatedTripRequest(params, "2026-10-18")).toBeNull();
  });

  it("supports a single activity", () => {
    const value = { ...draft, activities: ["Museums"] };
    expect(parseDatedTripDraft(draftParams(value))).toEqual(value);
  });

  it("supports an empty draft", () => {
    const value: DatedTripDraft = {
      departureAirportCode: "",
      outboundDate: "",
      returnDate: "",
      adultCount: "",
      budget: "",
      allowance: "",
      tripType: "",
      activities: [],
    };
    expect(parseDatedTripDraft(draftParams(value))).toEqual(value);
  });

  it.each([
    { kind: "other" },
    { draft: "2" },
    { draft: ["1", "1"] },
    { month: "June" },
    { departureAirportCode: "London" },
    { adultCount: ["2", "3"] },
    { outboundDate: "x".repeat(65) },
    { tripType: "unknown" },
    { activity: "Hiking" },
    { activity: ["Museums", "x".repeat(81)] },
    { activity: Array(6).fill("Museums") },
  ])("rejects malformed draft URLs: %j", (change) => {
    expect(parseDatedTripDraft({ ...draftParams(), ...change })).toBeNull();
  });
});
