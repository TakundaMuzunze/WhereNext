import { parseDiscoveryRequest, serializeDiscoveryRequest } from "./discoveryRequest";

const query = {
  kind: "discovery",
  timing: "flexible",
  nights: "5",
  adults: "2",
  budget: "200000",
  activity: ["Museums", "Swimming"],
};

it("round-trips flexible discovery without an airport or dates", () => {
  const request = parseDiscoveryRequest(query);
  expect(request).toEqual({
    kind: "discovery",
    timing: { kind: "flexible" },
    approximateNights: 5,
    adultCount: 2,
    groupBudgetPence: 200000,
    activities: ["Museums", "Swimming"],
  });
  const serialised = new URLSearchParams(serializeDiscoveryRequest(request!));
  const restored = { ...Object.fromEntries(serialised), activity: serialised.getAll("activity") };
  expect(parseDiscoveryRequest(restored)).toEqual(request);
});

it("retains a preferred month and exact dates, deriving exact nights across daylight saving", () => {
  expect(parseDiscoveryRequest({ ...query, timing: "month", month: "2027-06" })?.timing).toEqual({
    kind: "month",
    month: "2027-06",
  });
  const request = parseDiscoveryRequest({
    ...query,
    timing: "exact",
    outbound: "2027-03-27",
    return: "2027-03-30",
    nights: "20",
  });
  expect(request?.timing).toEqual({ kind: "exact", outboundDate: "2027-03-27", returnDate: "2027-03-30" });
  expect(request?.approximateNights).toBe(3);
  expect(new URLSearchParams(serializeDiscoveryRequest(request!)).get("outbound")).toBe("2027-03-27");
});

it.each([
  { adults: "0" },
  { budget: "-1" },
  { nights: "1.5" },
  { timing: "month", month: "2027-13" },
  { timing: "exact", outbound: "2027-02-30", return: "2027-03-04" },
  { timing: "exact", outbound: "2027-03-30", return: "2027-03-27" },
  { timing: "exact", outbound: "2027-03-01", return: "2027-04-01" },
  { adults: ["2", "4"] },
  { month: ["2027-06", "2027-07"] },
  { activity: ["Made up interest"] },
])("rejects malformed discovery inputs %j", (changes) => {
  expect(parseDiscoveryRequest({ ...query, ...changes })).toBeNull();
});

it("preserves interests through edits and sign-in metadata without accepting duplicated scalar fields", () => {
  const request = parseDiscoveryRequest({ ...query, resumeSave: "journey", activity: ["Museums", "Museums", "Swimming"] });
  expect(request?.activities).toEqual(["Museums", "Swimming"]);
});

it("round-trips an optional airport and rejects unsupported or repeated airport fields", () => {
  const request = parseDiscoveryRequest({ ...query, departureAirportCode: "MAN" });
  expect(request?.departureAirportCode).toBe("MAN");
  const params = new URLSearchParams(serializeDiscoveryRequest(request!));
  expect(parseDiscoveryRequest({ ...Object.fromEntries(params), activity: params.getAll("activity") })).toEqual(request);
  expect(parseDiscoveryRequest({ ...query, departureAirportCode: "XXX" })).toBeNull();
  expect(parseDiscoveryRequest({ ...query, departureAirportCode: ["MAN", "LHR"] })).toBeNull();
});
