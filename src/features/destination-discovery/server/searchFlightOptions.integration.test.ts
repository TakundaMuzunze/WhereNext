/** @jest-environment node */

import { prisma } from "@/shared/lib/db/prisma";
import { searchSerpApiFlightOptions as searchFlightOptions } from "./experimental/serpApiFlightSearch";

jest.mock("server-only", () => ({}), { virtual: true });

const originalFetch = global.fetch;
const originalEnvironment = { ...process.env };
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
const candidate = {
  destination_id: "/m/lisbon-fixture",
  name: "Lisbon",
  country: "Portugal",
  destination_airport: { code: "LIS" },
  start_date: trip.outboundDate,
  end_date: trip.returnDate,
  flight_price: 299,
  flight_duration: 160,
  number_of_stops: 0,
  link: "https://www.google.com/travel/explore?fixture=1",
};
function payload() {
  return {
    search_metadata: { status: "Success", processed_at: "2026-10-20 09:00:00 UTC" },
    search_parameters: {
      engine: "google_travel_explore",
      departure_id: "LHR",
      outbound_date: trip.outboundDate,
      return_date: trip.returnDate,
      adults: 2,
      currency: "GBP",
    },
    destinations: [candidate],
  };
}
function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.FLIGHT_TEST_DATABASE !== "disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/flight_test") {
    throw new Error("Use npm run test:flights:db to supply a disposable database.");
  }
}
beforeAll(assertDisposableDatabase);
beforeEach(async () => {
  assertDisposableDatabase();
  jest.useRealTimers();
  // Fake wall time only for trip validation; database time remains authoritative
  // for reservation concurrency and expiry checks.
  jest.spyOn(Intl.DateTimeFormat.prototype, "formatToParts").mockReturnValue([
    { type: "year", value: "2026" },
    { type: "month", value: "10" },
    { type: "day", value: "20" },
  ]);
  await prisma.searchReservation.deleteMany();
  await prisma.searchAllowance.upsert({
    where: { provider: "serpapi" },
    create: { provider: "serpapi", limit: 5, used: 0, hourlyLimit: 5, expiresAt: new Date(Date.now() + 3600000) },
    update: { limit: 5, used: 0, hourlyLimit: 5, expiresAt: new Date(Date.now() + 3600000) },
  });
  process.env.SERPAPI_FEASIBILITY_ENABLED = "true";
  process.env.FLIGHT_SEARCH_ENABLED = "true";
  process.env.SERPAPI_API_KEY = "fixture-secret";
  process.env.SERPAPI_PERMITTED_USE_REVIEWED = "true";
  process.env.SERPAPI_VERIFIED_PRICE_BASIS = "total_party";
  upstream.mockReset();
  upstream.mockImplementation(async () => Response.json(payload()));
  global.fetch = upstream;
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  process.env = { ...originalEnvironment };
  global.fetch = originalFetch;
});
afterAll(async () => {
  await prisma.$disconnect();
});

it("makes one bounded dated request and returns normalized group prices without leaking the secret", async () => {
  const result = await searchFlightOptions(trip);
  expect(result).toMatchObject({ status: "success", options: [{ price: { amountPence: 29900, adultCount: 2, basis: "total_party" } }] });
  expect(JSON.stringify(result)).not.toContain("fixture-secret");
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, init] = upstream.mock.calls[0];
  const parameters = new URL(String(url)).searchParams;
  expect(Object.fromEntries(parameters)).toMatchObject({
    departure_id: "LHR",
    adults: "2",
    arrival_area_id: "/m/02j9z",
    currency: "GBP",
    outbound_date: trip.outboundDate,
    return_date: trip.returnDate,
    type: "1",
    travel_class: "1",
  });
  expect(init).toMatchObject({ cache: "no-store", redirect: "error" });
  expect(await prisma.searchAllowance.findUnique({ where: { provider: "serpapi" } })).toMatchObject({ used: 1 });
});

it("rejects invalid requests, disabled search and missing verification without spending a reservation", async () => {
  expect(await searchFlightOptions({ ...trip, adultCount: 0 })).toEqual({ status: "invalid_request" });
  for (const setting of [
    "SERPAPI_FEASIBILITY_ENABLED",
    "FLIGHT_SEARCH_ENABLED",
    "SERPAPI_API_KEY",
    "SERPAPI_PERMITTED_USE_REVIEWED",
    "SERPAPI_VERIFIED_PRICE_BASIS",
  ]) {
    const saved = process.env[setting];
    delete process.env[setting];
    expect(await searchFlightOptions(trip)).toEqual({ status: "unavailable" });
    process.env[setting] = saved;
  }
  expect(await prisma.searchReservation.count()).toBe(0);
  expect(upstream).not.toHaveBeenCalled();
});

it("allows only one concurrent provider call for the same flight inputs even when budgets differ", async () => {
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => searchFlightOptions({ ...trip, groupBudgetPence: 200000 + index })));
  expect(results.filter(({ status }) => status === "success")).toHaveLength(1);
  expect(results.filter(({ status }) => status === "duplicate")).toHaveLength(7);
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(await prisma.searchReservation.count()).toBe(1);
});

it.each(["limit", "hourlyLimit"] as const)("enforces %s across concurrent distinct searches", async (setting) => {
  await prisma.searchAllowance.update({ where: { provider: "serpapi" }, data: { [setting]: 2 } });
  const results = await Promise.all([1, 2, 3, 4, 5, 6].map((adultCount) => searchFlightOptions({ ...trip, adultCount })));
  expect(results.filter(({ status }) => status === "unavailable")).toHaveLength(4);
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(await prisma.searchReservation.count()).toBe(2);
  expect(await prisma.searchAllowance.findUnique({ where: { provider: "serpapi" } })).toMatchObject({ used: 2 });
});

it("fails closed for missing or expired allowance and database failures", async () => {
  await prisma.searchAllowance.update({ where: { provider: "serpapi" }, data: { expiresAt: new Date(0) } });
  expect(await searchFlightOptions(trip)).toEqual({ status: "unavailable" });
  await prisma.searchAllowance.deleteMany();
  expect(await searchFlightOptions(trip)).toEqual({ status: "unavailable" });
  jest.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Database offline"));
  expect(await searchFlightOptions(trip)).toEqual({ status: "unavailable" });
  expect(upstream).not.toHaveBeenCalled();
});

it.each(["http", "malformed", "network"])(
  "retains the reservation after %s failure without retrying or exposing upstream details",
  async (failure) => {
    if (failure === "http") upstream.mockResolvedValue(new Response("Upstream private error", { status: 429 }));
    if (failure === "malformed") upstream.mockResolvedValue(Response.json({ error: "fixture-secret" }));
    if (failure === "network") upstream.mockRejectedValue(new Error("https://serpapi.com/?api_key=fixture-secret"));
    expect(await searchFlightOptions(trip)).toEqual({ status: "provider_failure" });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(await prisma.searchReservation.count()).toBe(1);
    expect(await searchFlightOptions(trip)).toMatchObject({ status: "duplicate" });
    expect(upstream).toHaveBeenCalledTimes(1);
  },
);

it("distinguishes an empty search from a malformed provider envelope", async () => {
  upstream.mockResolvedValue(Response.json({ ...payload(), destinations: [] }));
  expect(await searchFlightOptions(trip)).toEqual({ status: "empty" });
});

it("can search again after the cooldown while retaining previous quota usage", async () => {
  await searchFlightOptions(trip);
  await prisma.searchReservation.updateMany({ data: { blockedUntil: new Date(0) } });
  await searchFlightOptions(trip);
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(await prisma.searchAllowance.findUnique({ where: { provider: "serpapi" } })).toMatchObject({ used: 2 });
});

it("separates airport, date, adult and currency context rather than reusing a reservation", async () => {
  await searchFlightOptions(trip);
  await searchFlightOptions({ ...trip, departureAirportCode: "MAN" });
  await searchFlightOptions({ ...trip, outboundDate: "2026-11-11" });
  await searchFlightOptions({ ...trip, returnDate: "2026-11-15" });
  await searchFlightOptions({ ...trip, adultCount: 3 });
  expect(upstream).toHaveBeenCalledTimes(5);
  expect(await searchFlightOptions({ ...trip, currency: "EUR" })).toEqual({ status: "invalid_request" });
});

it("aborts a slow provider request after the configured timeout and does not retry", async () => {
  const realSetTimeout = global.setTimeout;
  const timer = jest
    .spyOn(global, "setTimeout")
    .mockImplementation((callback, delay, ...args) => realSetTimeout(callback, delay === 20_000 ? 1 : delay, ...args));
  upstream.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
      }),
  );
  expect(await searchFlightOptions(trip)).toEqual({ status: "provider_failure" });
  expect(timer).toHaveBeenCalledWith(expect.any(Function), 20_000);
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(await prisma.searchReservation.count()).toBe(1);
});

it("cannot activate the research provider in a production runtime", async () => {
  jest.replaceProperty(process.env, "NODE_ENV", "production");
  expect(await searchFlightOptions(trip)).toEqual({ status: "unavailable" });
  expect(upstream).not.toHaveBeenCalled();
  expect(await prisma.searchReservation.count()).toBe(0);
});
