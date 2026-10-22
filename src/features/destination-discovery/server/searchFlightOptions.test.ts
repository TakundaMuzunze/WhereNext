/** @jest-environment node */

import { searchFlightOptions } from "./searchFlightOptions";
import { reserveSerpApiSearch } from "./searchAllowance";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("./searchAllowance", () => ({ reserveSerpApiSearch: jest.fn().mockResolvedValue({ status: "reserved" }) }));
jest.mock("@/features/trip-planner/lib/datedPlannerSearchParams", () => ({ londonToday: () => "2026-10-20" }));

const originalEnvironment = { ...process.env };
const originalFetch = global.fetch;
const upstream = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const trip = {
  kind: "dated",
  departureAirportCode: "LHR",
  outboundDate: "2026-11-10",
  returnDate: "2026-11-14",
  adultCount: 2,
  currency: "GBP",
  groupBudgetPence: 200000,
  dailyAllowancePerPersonPence: 3000,
  preferences: { tripType: "city-break", activities: ["Museums"] },
};

beforeEach(() => {
  process.env.FLIGHT_SEARCH_ENABLED = "true";
  process.env.SERPAPI_API_KEY = "fixture-secret";
  process.env.SERPAPI_PERMITTED_USE_REVIEWED = "true";
  process.env.SERPAPI_VERIFIED_PRICE_BASIS = "total_party";
  upstream.mockReset();
  jest.mocked(reserveSerpApiSearch).mockClear();
  upstream.mockResolvedValue(
    Response.json({
      search_metadata: { status: "Success", processed_at: "2026-10-20 09:00:00 UTC" },
      search_parameters: {
        engine: "google_travel_explore",
        departure_id: "LHR",
        outbound_date: trip.outboundDate,
        return_date: trip.returnDate,
        adults: 2,
        currency: "GBP",
      },
      destinations: [],
    }),
  );
  global.fetch = upstream;
});

afterEach(() => {
  process.env = { ...originalEnvironment };
  global.fetch = originalFetch;
});

it("does not activate the rejected SerpApi production dependency even with its old enable flags", async () => {
  expect(await searchFlightOptions(trip)).toEqual({ status: "unavailable" });
  expect(upstream).not.toHaveBeenCalled();
  expect(reserveSerpApiSearch).not.toHaveBeenCalled();
});

it("still rejects invalid trip input before selecting any replacement provider", async () => {
  expect(await searchFlightOptions({ ...trip, adultCount: 0 })).toEqual({ status: "invalid_request" });
  expect(upstream).not.toHaveBeenCalled();
  expect(reserveSerpApiSearch).not.toHaveBeenCalled();
});
