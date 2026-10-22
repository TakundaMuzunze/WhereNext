/** @jest-environment node */
import { Pool } from "pg";
import { persistCandidates } from "./persistCandidates";
import type { DestinationCandidate } from "./fetchCandidates";

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
  importedAt: new Date("2026-10-22T12:00:00Z"),
};

beforeAll(() => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
  const isDisposableDatabase = process.env.CATALOGUE_TEST_DATABASE === "disposable";
  const isLocalDatabase = databaseUrl.hostname === "127.0.0.1";
  const hasExpectedDatabaseName = databaseUrl.pathname === "/catalogue_test";

  if (!isDisposableDatabase || !isLocalDatabase || !hasExpectedDatabaseName) {
    throw new Error("Disposable database required");
  }
});

beforeEach(async () => {
  await pool.query('DELETE FROM "DestinationCandidate"');
});

afterAll(async () => {
  await pool.end();
});

it("refreshes a place without changing identity or creating duplicates", async () => {
  await persistCandidates(pool, [faro]);
  await persistCandidates(pool, [{ ...faro, name: "Updated Faro", sourceRevisionId: 124 }]);

  const { rows } = await pool.query('SELECT "id", "name", "sourceRevisionId" FROM "DestinationCandidate"');

  expect(rows).toEqual([{ id: faro.id, name: "Updated Faro", sourceRevisionId: 124 }]);
});

it("retains destinations absent from a later refresh", async () => {
  await persistCandidates(pool, [faro]);
  await persistCandidates(pool, []);
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationCandidate"')).rows).toEqual([{ count: 1 }]);
});

it("rolls back the entire refresh when an identity conflicts", async () => {
  await persistCandidates(pool, [faro]);
  await expect(
    persistCandidates(pool, [
      { ...faro, name: "Must roll back" },
      { ...faro, id: "wikidata:Q597", wikidataId: "Q597" },
    ]),
  ).rejects.toThrow();
  expect((await pool.query('SELECT "name" FROM "DestinationCandidate"')).rows).toEqual([{ name: "Faro" }]);
});

it("enforces coordinate bounds in the database", async () => {
  await expect(persistCandidates(pool, [{ ...faro, latitude: 91 }])).rejects.toThrow();
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationCandidate"')).rows).toEqual([{ count: 0 }]);
});
