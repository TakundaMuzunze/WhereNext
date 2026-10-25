/** @jest-environment node */
import { prisma } from "@/shared/lib/db/prisma";
import { Pool } from "pg";
import type { DestinationCandidate } from "./fetchCandidates";
import { persistCandidates } from "./persistCandidates";
import { getDestinationCandidate, listDestinationCandidates } from "./readCandidates";

jest.mock("server-only", () => ({}), { virtual: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const faro: DestinationCandidate = {
  id: "wikidata:Q159457",
  wikidataId: "Q159457",
  wikivoyagePageId: 11446,
  name: "Faro",
  countryCode: "PT",
  latitude: 37.0333,
  longitude: -7.9167,
  sourceUrl: "https://en.wikivoyage.org/wiki/Faro",
  sourceRevisionId: 123,
  guideStatus: "usable",
  importedAt: new Date("2026-10-25T12:00:00Z"),
};

function assertDisposableDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
  const isDisposableDatabase = process.env.CATALOGUE_TEST_DATABASE === "disposable";
  const isLocalDatabase = databaseUrl.hostname === "127.0.0.1";
  const hasExpectedDatabaseName = databaseUrl.pathname === "/catalogue_test";

  if (!isDisposableDatabase || !isLocalDatabase || !hasExpectedDatabaseName) {
    throw new Error("Use the disposable catalogue database runner.");
  }
}

beforeAll(assertDisposableDatabase);

beforeEach(async () => {
  assertDisposableDatabase();
  await prisma.destinationCandidate.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

it("reads an imported destination with its original identity and provenance", async () => {
  await persistCandidates(pool, [faro]);

  const destination = await getDestinationCandidate(faro.id);

  expect(destination).toEqual(faro);
});

it("pages through the selected country without repeating or mixing destinations", async () => {
  const lisbon: DestinationCandidate = {
    ...faro,
    id: "wikidata:Q597",
    wikidataId: "Q597",
    wikivoyagePageId: 19798,
    name: "Lisbon",
    latitude: 38.7071,
    longitude: -9.1353,
    sourceUrl: "https://en.wikivoyage.org/wiki/Lisbon",
  };

  const barcelona: DestinationCandidate = {
    ...faro,
    id: "wikidata:Q1492",
    wikidataId: "Q1492",
    wikivoyagePageId: 2000,
    name: "Barcelona",
    countryCode: "ES",
    latitude: 41.3851,
    longitude: 2.1734,
    sourceUrl: "https://en.wikivoyage.org/wiki/Barcelona",
  };

  await persistCandidates(pool, [lisbon, barcelona, faro]);

  const firstPage = await listDestinationCandidates({ countryCode: "PT", limit: 1 });

  expect(firstPage.candidates).toEqual([faro]);
  expect(firstPage.nextAfterId).toBe(faro.id);

  const secondPage = await listDestinationCandidates({
    countryCode: "PT",
    limit: 1,
    afterId: firstPage.nextAfterId,
  });

  expect(secondPage.candidates).toEqual([lisbon]);
  expect(secondPage.nextAfterId).toBeNull();
});

it("returns an empty page and null lookup when nothing is stored", async () => {
  expect(await listDestinationCandidates()).toEqual({
    candidates: [],
    nextAfterId: null,
  });

  expect(await getDestinationCandidate(faro.id)).toBeNull();
});

it("reads refreshed records without changing their identity or duplicating them", async () => {
  await persistCandidates(pool, [faro]);

  const refreshedFaro: DestinationCandidate = {
    ...faro,
    name: "Updated Faro",
    sourceRevisionId: 124,
    importedAt: new Date("2026-10-26T12:00:00Z"),
  };

  await persistCandidates(pool, [refreshedFaro]);

  expect(await getDestinationCandidate(faro.id)).toEqual(refreshedFaro);
  expect(await listDestinationCandidates()).toEqual({
    candidates: [refreshedFaro],
    nextAfterId: null,
  });
});

it("does not fall back to another country when the selected country has no records", async () => {
  await persistCandidates(pool, [faro]);

  expect(await listDestinationCandidates({ countryCode: "ES" })).toEqual({
    candidates: [],
    nextAfterId: null,
  });
});

it.each([
  { limit: 0 },
  { limit: 101 },
  { limit: 1.5 },
  { limit: "10" },
  { countryCode: "portugal" },
  { afterId: "not-a-destination-id" },
  { unknownFilter: true },
])("rejects invalid catalogue options %j", async (options) => {
  await expect(listDestinationCandidates(options)).rejects.toThrow();
});

it("rejects malformed destination identities", async () => {
  await expect(getDestinationCandidate("Q159457")).rejects.toThrow();
});
