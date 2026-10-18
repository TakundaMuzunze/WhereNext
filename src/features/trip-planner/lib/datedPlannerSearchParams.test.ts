import { londonToday, parseDatedTripRequest, poundsToPence, serializeDatedTripRequest, tripNights } from "./datedPlannerSearchParams";
import { parsePlannerAnswers, type PlannerSearchParams } from "./plannerSearchParams";
import type { DatedTripRequest } from "@/entities/trip/model/types";

const request: DatedTripRequest = {
  kind: "dated",
  departureAirportCode: "MAN",
  outboundDate: "2026-11-10",
  returnDate: "2026-11-14",
  adultCount: 2,
  currency: "GBP",
  groupBudgetPence: 200000,
  dailyAllowancePerPersonPence: 5000,
  preferences: { tripType: "city-break", activities: ["Museums", "Architecture"] },
};

function params(query: string): PlannerSearchParams {
  const result: PlannerSearchParams = {};
  new URLSearchParams(query).forEach((value, key, values) => {
    const all = values.getAll(key);
    result[key] = all.length > 1 ? all : value;
  });
  return result;
}

const valid = params(serializeDatedTripRequest(request));

describe("dated planner URL boundary", () => {
  it("round trips the complete request without duration or month", () => {
    expect(parseDatedTripRequest(valid, "2026-10-18")).toEqual(request);
    expect(valid.month).toBeUndefined();
    expect(valid.duration).toBeUndefined();
    expect(tripNights(request)).toBe(4);
  });

  it("supports a single activity and unrelated navigation parameters", () => {
    expect(parseDatedTripRequest({ ...valid, activity: "Museums", resumeSave: "journey" }, "2026-10-18")?.preferences.activities).toEqual([
      "Museums",
    ]);
  });

  it.each(["month", "duration", "departure", "budget", "travellers"])("rejects conflicting legacy %s", (key) => {
    expect(parseDatedTripRequest({ ...valid, [key]: "1" }, "2026-10-18")).toBeNull();
  });

  it.each([
    "kind",
    "departureAirportCode",
    "outboundDate",
    "returnDate",
    "adultCount",
    "currency",
    "groupBudgetPence",
    "dailyAllowancePerPersonPence",
    "tripType",
  ])("rejects repeated scalar %s", (key) => {
    expect(parseDatedTripRequest({ ...valid, [key]: [String(valid[key]), String(valid[key])] }, "2026-10-18")).toBeNull();
  });

  it.each(["", "2.5", "1e2", "NaN", "Infinity", "-1", " 2"])("rejects malformed integer %j", (adultCount) => {
    expect(parseDatedTripRequest({ ...valid, adultCount }, "2026-10-18")).toBeNull();
  });

  it.each([
    { kind: undefined },
    { kind: "other" },
    { activity: undefined },
    { activity: "Hiking" },
    { outboundDate: "2026-02-30" },
    { returnDate: "2026-11-10" },
    { groupBudgetPence: "99" },
  ])("rejects invalid requests: %j", (change) => {
    expect(parseDatedTripRequest({ ...valid, ...change }, "2026-10-18")).toBeNull();
  });

  it("does not treat a marked dated request as legacy answers", () => {
    expect(
      parsePlannerAnswers({
        kind: "dated",
        departure: "London",
        month: "June",
        duration: "5",
        budget: "2000",
        travellers: "2",
        tripType: "city-break",
        activity: "Museums",
      }),
    ).toBeNull();
  });

  it("uses the London calendar date across midnight and daylight saving", () => {
    expect(londonToday(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(londonToday(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
    expect(londonToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = londonToday();
    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    expect(parseDatedTripRequest({ ...valid, outboundDate: today, returnDate: tomorrow.toISOString().slice(0, 10) })).not.toBeNull();
  });
});

it.each([
  ["0", 0],
  ["19.99", 1999],
  ["1.1", 110],
  ["100000", 10000000],
  ["", undefined],
  ["1.999", undefined],
  ["-1", undefined],
  ["1e2", undefined],
  ["Infinity", undefined],
])("converts pound input %s to %s pence", (input, expected) => {
  expect(poundsToPence(String(input))).toBe(expected);
});
