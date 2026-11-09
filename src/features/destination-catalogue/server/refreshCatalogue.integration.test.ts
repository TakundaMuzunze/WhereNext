/** @jest-environment node */
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/catalogue_test") {
    throw new Error("Use the disposable catalogue database runner.");
  }
});

beforeEach(async () => {
  await pool.query('DELETE FROM "CatalogueRefresh"');
  await pool.query('DELETE FROM "DestinationCandidate"');
});

afterAll(async () => {
  await pool.end();
});

function runRefresh(argumentsList: string[], options: { failure?: string; environment?: Partial<NodeJS.ProcessEnv>; country?: string } = {}) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--import",
      "./src/features/destination-catalogue/testing/cliSourceFixture.mjs",
      "scripts/refresh-destination-catalogue.mjs",
      options.country ?? "PT",
      ...argumentsList,
    ],
    { encoding: "utf8", timeout: 15000, env: { ...process.env, CATALOGUE_TEST_SOURCE_FAILURE: options.failure ?? "", ...options.environment } },
  );
}

it("previews a bounded country refresh without saving destinations or advancing its checkpoint", async () => {
  const result = runRefresh(["--max-pages", "1"]);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    mode: "preview",
    countries: [{ country: "PT", scanned: 50, saved: 0, status: "pending", nextCursor: "PT:Q1049" }],
  });
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationCandidate"')).rows).toEqual([{ count: 0 }]);
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "CatalogueRefresh"')).rows).toEqual([{ count: 0 }]);
});

it("commits each page with its checkpoint, resumes the country, and skips a completed monthly cycle", async () => {
  const first = runRefresh(["--max-pages", "1", "--apply"]);
  expect(first.status).toBe(0);
  expect(JSON.parse(first.stdout)).toMatchObject({ countries: [{ saved: 50, status: "pending", nextCursor: "PT:Q1049" }] });
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationCandidate"')).rows).toEqual([{ count: 50 }]);

  const resumed = runRefresh(["--apply"]);
  expect(resumed.status).toBe(0);
  expect(JSON.parse(resumed.stdout)).toMatchObject({ countries: [{ scanned: 1, saved: 1, status: "complete", nextCursor: null }] });

  const completed = runRefresh(["--apply"], { failure: "always" });
  expect(completed.status).toBe(0);
  expect(JSON.parse(completed.stdout)).toMatchObject({ countries: [{ pages: 0, scanned: 0, saved: 0, status: "not_due" }] });
});

it("retains committed pages after a source failure and resumes without losing destinations", async () => {
  const failed = runRefresh(["--apply"], { failure: "second" });
  expect(failed.status).toBe(1);
  expect(JSON.parse(failed.stdout)).toMatchObject({ failed: true, countries: [{ saved: 50, status: "failed", nextCursor: "PT:Q1049" }] });
  const resumed = runRefresh(["--apply"]);
  expect(resumed.status).toBe(0);
  expect(JSON.parse(resumed.stdout)).toMatchObject({ countries: [{ saved: 1, status: "complete" }] });
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationCandidate"')).rows).toEqual([{ count: 51 }]);
});

it("blocks both scheduled and manual apply commands before fetching when another import holds the database lock", async () => {
  const connection = await pool.connect();
  await connection.query("SELECT pg_advisory_lock(78293, 38)");
  try {
    const scheduled = runRefresh(["--apply"], { failure: "always" });
    expect(scheduled.status).toBe(1);
    expect(scheduled.stderr).toContain("Another catalogue import is running");
    const manual = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--import",
        "./src/features/destination-catalogue/testing/cliSourceFixture.mjs",
        "scripts/import-destinations.mjs",
        "PT",
        "--apply",
      ],
      {
        encoding: "utf8",
        timeout: 15000,
        env: { ...process.env, CATALOGUE_TEST_SOURCE_FAILURE: "always" },
      },
    );
    expect(manual.status).toBe(1);
    expect(manual.stderr).toContain("Another catalogue import is running");
  } finally {
    await connection.query("SELECT pg_advisory_unlock(78293, 38)");
    connection.release();
  }
});

it("starts a new month from the beginning but resumes an unfinished older cycle", async () => {
  const completed = runRefresh(["--apply"]);
  expect(completed.status).toBe(0);
  await pool.query(
    `UPDATE "CatalogueRefresh" SET "cycleStartedAt" = date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 days', "completedAt" = date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 day'`,
  );
  const newCycle = runRefresh(["--max-pages", "1", "--apply"]);
  expect(newCycle.status).toBe(0);
  expect(JSON.parse(newCycle.stdout)).toMatchObject({ countries: [{ saved: 50, nextCursor: "PT:Q1049" }] });

  await pool.query(
    `UPDATE "CatalogueRefresh" SET "cycleStartedAt" = date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 months'`,
  );
  const resumed = runRefresh(["--apply"]);
  expect(resumed.status).toBe(0);
  expect(JSON.parse(resumed.stdout)).toMatchObject({ countries: [{ scanned: 1, saved: 1, status: "complete" }] });
});

it("rolls back a conflicting page and its checkpoint without touching an existing destination", async () => {
  await pool.query(`INSERT INTO "DestinationCandidate" ("id", "wikidataId", "wikivoyagePageId", "name", "countryCode", "latitude", "longitude", "sourceUrl", "sourceRevisionId", "guideStatus", "importedAt")
    VALUES ('wikidata:Q9000', 'Q9000', 1050, 'Existing place', 'PT', 37, -8, 'https://en.wikivoyage.org/wiki/Existing_place', 1, 'usable', CURRENT_TIMESTAMP)`);
  const result = runRefresh(["--apply"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("identity conflict for Q1050");
  expect(JSON.parse(result.stdout)).toMatchObject({ countries: [{ saved: 50, nextCursor: "PT:Q1049", status: "failed" }] });
  expect((await pool.query('SELECT "cursor" FROM "CatalogueRefresh"')).rows).toEqual([{ cursor: "PT:Q1049" }]);
  expect((await pool.query('SELECT "name" FROM "DestinationCandidate" WHERE "id" = $1', ["wikidata:Q9000"])).rows).toEqual([
    { name: "Existing place" },
  ]);
});

it("rejects mismatched application and direct database targets before any work", () => {
  const wrongTarget = "postgresql://fixture:private-password@example.invalid/other_database";
  const result = runRefresh(["--apply"], { failure: "always", environment: { DIRECT_URL: wrongTarget } });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("same database as DATABASE_URL");
  expect(result.stderr).not.toContain("private-password");
});

it("refreshes all supported countries with distinct checkpoints and a complete summary", async () => {
  const result = runRefresh(["--apply"], { country: "ALL" });
  expect(result.status).toBe(0);
  const summary = JSON.parse(result.stdout);
  expect(summary.countries.map((country: { country: string; status: string }) => [country.country, country.status])).toEqual([
    ["PT", "complete"],
    ["ES", "complete"],
    ["FR", "complete"],
    ["IT", "complete"],
    ["GR", "complete"],
    ["MT", "complete"],
  ]);
  expect(summary.notRun).toEqual([]);
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationCandidate"')).rows).toEqual([{ count: 56 }]);
});
