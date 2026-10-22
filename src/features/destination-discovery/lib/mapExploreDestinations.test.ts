import { mapExploreDestinations } from "./mapExploreDestinations";

const request = {
  departureAirportCode: "LHR",
  outboundDate: "2026-11-10",
  returnDate: "2026-11-14",
  adultCount: 2,
  currency: "GBP",
} as const;
const pricing = { adultCount: 2, basis: "total_party" } as const;
const retrievedAt = "2026-10-20T10:00:00Z";
const candidate = {
  destination_id: "provider-lisbon",
  name: "Lisbon",
  country: "Portugal",
  destination_airport: { code: "LIS" },
  start_date: request.outboundDate,
  end_date: request.returnDate,
  flight_price: 299.01,
  flight_duration: 160,
  number_of_stops: 0,
  link: "https://www.google.com/travel/explore?example=fixture",
};
const response = {
  search_metadata: { status: "Success", processed_at: "2026-10-20 09:00:00 UTC" },
  search_parameters: {
    engine: "google_travel_explore",
    departure_id: "LHR",
    outbound_date: request.outboundDate,
    return_date: request.returnDate,
    adults: 2,
    currency: "GBP",
  },
  destinations: [candidate],
};

it("preserves the group price without multiplying and keeps retrieval and provider times distinct", () => {
  const [option] = mapExploreDestinations(response, pricing, request, retrievedAt);
  expect(option.price).toEqual({ amountPence: 29901, adultCount: 2, basis: "total_party" });
  expect(option.destination).toEqual({ providerId: "provider-lisbon", name: "Lisbon", country: "Portugal" });
  expect(option.retrievedAt).toBe(retrievedAt);
  expect(option.providerProcessedAt).toBe("2026-10-20T09:00:00.000Z");
});

it.each([{ departure_id: "MAN" }, { outbound_date: "2026-11-11" }, { return_date: undefined }, { adults: 1 }, { currency: "EUR" }])(
  "rejects absent or conflicting search context: %j",
  (change) => {
    expect(
      mapExploreDestinations({ ...response, search_parameters: { ...response.search_parameters, ...change } }, pricing, request, retrievedAt),
    ).toEqual([]);
  },
);

it.each([
  { start_date: undefined },
  { end_date: "2026-11-15" },
  { flight_price: -1 },
  { flight_price: 0 },
  { flight_price: 12.345 },
  { flight_price: Infinity },
  { country: "United Kingdom" },
  { destination_airport: undefined },
  { link: "https://example.com/travel/explore" },
])("drops an unusable candidate while retaining a valid neighbour: %j", (change) => {
  const options = mapExploreDestinations({ ...response, destinations: [{ ...candidate, ...change }, candidate] }, pricing, request, retrievedAt);
  expect(options).toHaveLength(1);
  expect(options[0].destination.name).toBe("Lisbon");
});

it("returns no options for failed, malformed or empty responses and invalid timestamps", () => {
  for (const raw of [null, {}, { ...response, destinations: [] }, { ...response, search_metadata: { status: "Error" } }]) {
    expect(mapExploreDestinations(raw, pricing, request, retrievedAt)).toEqual([]);
  }
  expect(mapExploreDestinations(response, pricing, request, "yesterday")).toEqual([]);
  expect(
    mapExploreDestinations(
      { ...response, search_metadata: { status: "Success", processed_at: "2026-02-30 09:00:00 UTC" } },
      pricing,
      request,
      retrievedAt,
    ),
  ).toEqual([]);
  expect(mapExploreDestinations(response, { ...pricing, adultCount: 1 }, request, retrievedAt)).toEqual([]);
});
