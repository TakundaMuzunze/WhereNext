/** @jest-environment node */
import { discoverDestinations } from "./discoverDestinations";
import { providerJson } from "./providerRequest";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("./providerRequest", () => ({ providerJson: jest.fn(), providerRetrievedAt: () => "2026-10-20T12:00:00Z" }));
jest.mock("@/features/trip-planner/lib/datedPlannerSearchParams", () => ({ londonToday: () => "2026-10-20" }));
const originalEnv = { ...process.env };
const trip = {
  kind: "dated",
  departureAirportCode: "LHR",
  outboundDate: "2026-11-10",
  returnDate: "2026-11-14",
  adultCount: 2,
  currency: "GBP",
  groupBudgetPence: 200000,
  dailyAllowancePerPersonPence: 3000,
  preferences: { tripType: "city-break", activities: ["Museums", "Food markets"] },
};
const fare = {
  destination: "FAO",
  origin_airport: "LHR",
  destination_airport: "FAO",
  price: 142,
  departure_at: "2026-11-10T06:00:00Z",
  return_at: "2026-11-14T11:10:00Z",
  transfers: 1,
  link: "/search/LHR1011FAO14111?expected_price_currency=gbp",
};
const city = { code: "FAO", name: "Faro", country_code: "PT", coordinates: { lat: 37.02, lon: -7.93 } };
const geo = { geonameId: 2268339, name: "Faro", countryCode: "PT", lat: "37.01869", lng: "-7.92716" };

beforeEach(() => {
  process.env.TRAVELPAYOUTS_API_TOKEN = "flight-key";
  process.env.GEONAMES_USERNAME = "test-user";
  process.env.GEOAPIFY_API_KEY = "places-key";
  process.env.LIVE_DISCOVERY_ENABLED = "true";
  jest
    .mocked(providerJson)
    .mockReset()
    .mockImplementation(async (_provider, url) => {
      if (url.pathname.includes("prices_for_dates")) return { success: true, currency: "gbp", data: [fare] };
      if (url.pathname.includes("cities.json")) return [city];
      if (url.pathname.includes("searchJSON")) return { geonames: [geo] };
      return { features: [{ properties: { name: "Local museum", categories: ["entertainment.museum"], place_id: "one", lat: 37.02, lon: -7.93 } }] };
    });
});
afterEach(() => {
  process.env = { ...originalEnv };
});

it("joins dated fares to geography and evidence, estimating group costs without claiming a hotel price", async () => {
  const result = await discoverDestinations(trip);
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error("Expected success");
  expect(result.recommendations[0]).toMatchObject({
    name: "Faro",
    geonamesId: 2268339,
    estimatedGroupFlightsPence: 28400,
    spendingPence: 30000,
    remainingForStayPence: 141600,
    evidence: [
      { activity: "Museums", status: "supported" },
      { activity: "Food markets", status: "unknown", places: [] },
    ],
  });
  const flightCall = jest.mocked(providerJson).mock.calls[0];
  expect(flightCall[1].searchParams.get("origin")).toBe("LHR");
  expect(flightCall[1].searchParams.get("departure_at")).toBe(trip.outboundDate);
  expect(flightCall[1].searchParams.get("return_at")).toBe(trip.returnDate);
  expect(jest.mocked(providerJson).mock.calls.find(([provider]) => provider === "geonames")?.[1].protocol).toBe("https:");
});

it("rejects invalid input without provider calls", async () => {
  expect(await discoverDestinations({ ...trip, adultCount: 0 })).toEqual({ status: "invalid_request" });
  expect(providerJson).not.toHaveBeenCalled();
});
it("fails closed when configuration is missing", async () => {
  delete process.env.GEONAMES_USERNAME;
  expect(await discoverDestinations(trip)).toEqual({ status: "unavailable" });
  expect(providerJson).not.toHaveBeenCalled();
});
it("does not substitute city airports or nearby dates", async () => {
  jest.mocked(providerJson).mockResolvedValueOnce({
    success: true,
    currency: "gbp",
    data: [
      { ...fare, origin_airport: "STN" },
      { ...fare, departure_at: "2026-11-11T06:00:00Z" },
      { ...fare, return_at: "2026-11-15T06:00:00Z" },
    ],
  });
  expect(await discoverDestinations(trip)).toEqual({ status: "empty" });
});
it("filters unsupported countries", async () => {
  jest
    .mocked(providerJson)
    .mockResolvedValueOnce({ success: true, currency: "gbp", data: [fare] })
    .mockResolvedValueOnce([{ ...city, country_code: "US" }]);
  expect(await discoverDestinations(trip)).toEqual({ status: "empty" });
});
it("retains estimates with unknown evidence if GeoNames is unavailable", async () => {
  jest
    .mocked(providerJson)
    .mockResolvedValueOnce({ success: true, currency: "gbp", data: [fare] })
    .mockResolvedValueOnce([city])
    .mockRejectedValueOnce(new Error("down"));
  const result = await discoverDestinations(trip);
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error("Expected success");
  expect(result.partial).toBe(true);
  expect(result.recommendations[0].geonamesId).toBeNull();
  expect(result.recommendations[0].evidence.every(({ status }) => status === "unknown")).toBe(true);
});
it("does not guess between ambiguous nearby places", async () => {
  jest
    .mocked(providerJson)
    .mockResolvedValueOnce({ success: true, currency: "gbp", data: [fare] })
    .mockResolvedValueOnce([city])
    .mockResolvedValueOnce({ geonames: [geo, { ...geo, geonameId: 123 }] });
  const result = await discoverDestinations(trip);
  if (result.status !== "success") throw new Error("Expected success");
  expect(result.recommendations[0].geonamesId).toBeNull();
});
it("returns unknown rather than mismatch when places are empty", async () => {
  jest
    .mocked(providerJson)
    .mockResolvedValueOnce({ success: true, currency: "gbp", data: [fare] })
    .mockResolvedValueOnce([city])
    .mockResolvedValueOnce({ geonames: [geo] })
    .mockResolvedValueOnce({ features: [] });
  const result = await discoverDestinations(trip);
  if (result.status !== "success") throw new Error("Expected success");
  expect(result.recommendations[0].evidence[0].status).toBe("unknown");
});
it("rejects an unexpected provider currency instead of treating it as pounds", async () => {
  jest.mocked(providerJson).mockResolvedValueOnce({ success: true, currency: "rub", data: [fare] });
  expect(await discoverDestinations(trip)).toEqual({ status: "provider_failure" });
});

it("rejects wrapped coordinates rather than treating malformed places as nearby evidence", async () => {
  jest
    .mocked(providerJson)
    .mockResolvedValueOnce({ success: true, currency: "gbp", data: [fare] })
    .mockResolvedValueOnce([city])
    .mockResolvedValueOnce({ geonames: [geo] })
    .mockResolvedValueOnce({
      features: [
        { properties: { name: "Malformed museum", categories: ["entertainment.museum"], place_id: "wrapped", lat: 37.02, lon: -7.93 + 360 } },
      ],
    });
  const result = await discoverDestinations(trip);
  if (result.status !== "success") throw new Error("Expected success");
  expect(result.recommendations[0].evidence[0]).toEqual({ activity: "Museums", status: "unknown", places: [] });
});

it("does not equate generic restaurants with verified local restaurants", async () => {
  const result = await discoverDestinations({ ...trip, preferences: { tripType: "foodie", activities: ["Local restaurants"] } });
  if (result.status !== "success") throw new Error("Expected success");
  expect(result.recommendations[0].evidence).toEqual([{ activity: "Local restaurants", status: "unknown", places: [] }]);
  expect(jest.mocked(providerJson).mock.calls.some(([provider]) => provider === "geoapify")).toBe(false);
});
