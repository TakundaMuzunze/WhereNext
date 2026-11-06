/** @jest-environment node */
import { Pool } from "pg";
import { spawnSync } from "node:child_process";
import { prisma } from "@/shared/lib/db/prisma";
import { climateLocation, type ClimateObservation } from "../model/climateObservation";
import { persistClimate } from "./persistClimate";
import { readClimate } from "./readClimate";

jest.mock("server-only", () => ({}), { virtual: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const location = climateLocation(38.722, -9.139);

function observation(): ClimateObservation {
  return {
    source: "nasa-power",
    apiVersion: "v2.10.1",
    baselineStart: 1991,
    baselineEnd: 2020,
    latitude: location.latitude,
    longitude: location.longitude,
    elevationMetres: 24,
    retrievedAt: new Date().toISOString(),
    months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, meanTemperatureC: 20, precipitationMmPerDay: 1 })),
  };
}

beforeAll(() => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || databaseUrl.hostname !== "127.0.0.1" || databaseUrl.pathname !== "/catalogue_test") {
    throw new Error("Use the disposable catalogue database runner.");
  }
});

beforeEach(async () => {
  await pool.query('DELETE FROM "SeasonalClimate"');
});

afterAll(async () => {
  await pool.end();
  await prisma.$disconnect();
});

it("stores one shared source cell and reuses it for nearby destination coordinates", async () => {
  const climate = observation();
  await persistClimate(pool, climate);
  await persistClimate(pool, climate);

  const result = await readClimate([
    { latitude: 38.722, longitude: -9.139 },
    { latitude: 38.7, longitude: -9.2 },
  ]);
  expect(result.size).toBe(1);
  expect(result.get(location.requestKey)).toEqual(climate);
});

it("retains the previous snapshot when replacement validation fails", async () => {
  const climate = observation();
  await persistClimate(pool, climate);
  await expect(persistClimate(pool, { ...climate, baselineEnd: 2025 })).rejects.toThrow();
  expect((await readClimate([location])).get(location.requestKey)).toEqual(climate);
});

it("ignores expired, future-dated, mismatched and malformed stored observations", async () => {
  const climate = observation();
  await persistClimate(pool, { ...climate, retrievedAt: "2020-01-01T00:00:00Z" });
  expect((await readClimate([location])).size).toBe(0);
  await persistClimate(pool, { ...climate, retrievedAt: "2099-01-01T00:00:00Z" });
  expect((await readClimate([location])).size).toBe(0);
  await persistClimate(pool, climate);
  await pool.query('UPDATE "SeasonalClimate" SET "observation" = $1::jsonb', [JSON.stringify({ ...climate, latitude: 40 })]);
  expect((await readClimate([location])).size).toBe(0);
  await pool.query('UPDATE "SeasonalClimate" SET "observation" = $1::jsonb', [JSON.stringify({ invalid: true })]);
  expect((await readClimate([location])).size).toBe(0);
});

it("returns unknown climate when the additive migration is unavailable", async () => {
  await pool.query('ALTER TABLE "SeasonalClimate" RENAME TO "UnavailableSeasonalClimate"');
  try {
    expect((await readClimate([location])).size).toBe(0);
  } finally {
    await pool.query('ALTER TABLE "UnavailableSeasonalClimate" RENAME TO "SeasonalClimate"');
  }
});

async function seedCommandDestinations() {
  await prisma.destinationCandidate.deleteMany();
  await prisma.destinationCandidate.createMany({
    data: [1, 2, 3].map((number) => ({
      id: `wikidata:Q${number}`,
      wikidataId: `Q${number}`,
      wikivoyagePageId: number,
      name: `Test destination ${number}`,
      countryCode: "PT",
      latitude: number === 3 ? 40 : 38.722,
      longitude: -9.139,
      sourceUrl: "https://en.wikivoyage.org/wiki/Test",
      sourceRevisionId: 1,
      guideStatus: "usable",
      importedAt: new Date(),
    })),
  });
}

function runCommand(argumentsList: string[], failSecond = false) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--import",
      "./src/features/destination-seasons/testing/cliSourceFixture.mjs",
      "scripts/enrich-destination-climate.mjs",
      ...argumentsList,
    ],
    {
      encoding: "utf8",
      timeout: 15000,
      env: { ...process.env, CLIMATE_TEST_FAIL_SECOND: String(failSecond) },
    },
  );
}

it("previews all bounded pages without writes, then applies and reuses shared cells", async () => {
  await seedCommandDestinations();
  const preview = runCommand(["--limit", "1", "--all-batches"]);
  expect(preview.status).toBe(0);
  expect(JSON.parse(preview.stdout)).toMatchObject({ mode: "preview", scanned: 3, fetched: 2, hasMore: false });
  expect((await readClimate([{ latitude: 38.722, longitude: -9.139 }])).size).toBe(0);

  const applied = runCommand(["--limit", "1", "--all-batches", "--apply"]);
  expect(applied.status).toBe(0);
  expect(JSON.parse(applied.stdout)).toMatchObject({ scanned: 3, fetched: 2, hasMore: false });
  expect(
    (
      await readClimate([
        { latitude: 38.722, longitude: -9.139 },
        { latitude: 40, longitude: -9.139 },
      ])
    ).size,
  ).toBe(2);

  const repeated = runCommand(["--all-batches", "--apply"]);
  expect(repeated.status).toBe(0);
  expect(JSON.parse(repeated.stdout)).toMatchObject({ fetched: 0, reused: 2 });
});

it("stops on source failure and resumes after the last completed destination without losing saved cells", async () => {
  await seedCommandDestinations();
  const failed = runCommand(["--all-batches", "--apply"], true);
  expect(failed.status).toBe(1);
  expect(failed.stderr).toContain("Climate enrichment failed while retrieving and validating NASA climate evidence (Error).");
  expect(failed.stderr).toContain("--cursor wikidata:Q2");
  expect((await readClimate([{ latitude: 38.722, longitude: -9.139 }])).size).toBe(1);

  const resumed = runCommand(["--cursor", "wikidata:Q2", "--all-batches", "--apply"]);
  expect(resumed.status).toBe(0);
  expect(JSON.parse(resumed.stdout)).toMatchObject({ scanned: 1, fetched: 1, hasMore: false });
});
