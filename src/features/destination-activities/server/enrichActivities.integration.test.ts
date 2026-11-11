/** @jest-environment node */
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { createHash } from "node:crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
jest.setTimeout(60000);

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/catalogue_test") {
    throw new Error("Use the disposable catalogue database runner.");
  }
});

beforeEach(async () => {
  await pool.query('DELETE FROM "ActivityEnrichmentAttempt"');
  await pool.query('DELETE FROM "DestinationCandidate"');
  await pool.query('DELETE FROM "DestinationActivityEvidence"');
  await pool.query('DELETE FROM "SearchReservation"');
  await pool.query('DELETE FROM "SearchAllowance"');
  await pool.query(`INSERT INTO "DestinationCandidate"
    ("id", "wikidataId", "wikivoyagePageId", "name", "countryCode", "latitude", "longitude", "sourceUrl", "sourceRevisionId", "guideStatus", "importedAt")
    VALUES ('wikidata:Q999991', 'Q999991', 999991, 'Test place', 'PT', 37, -8, 'https://en.wikivoyage.org/wiki/Test', 1, 'usable', now())`);
});

afterAll(async () => {
  await pool.end();
});

function run(argumentsList: string[], failure = "", environment: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--import",
      "./src/features/destination-activities/testing/cliSourceFixture.mjs",
      "scripts/enrich-destination-activities.mjs",
      ...argumentsList,
    ],
    {
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...process.env,
        GEOAPIFY_API_KEY: argumentsList.includes("--apply") ? "fixture-key" : "",
        ACTIVITY_EVIDENCE_ENABLED: String(argumentsList.includes("--apply")),
        ACTIVITY_TEST_FAILURE: failure,
        ...environment,
      },
    },
  );
}

it("previews missing activity work without provider credentials, reservations or evidence writes", async () => {
  const result = run([]);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ mode: "preview", missing: 5, expired: 0, attempted: 0, saved: 0 });
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "SearchReservation"')).rows[0].count).toBe(0);
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "DestinationActivityEvidence"')).rows[0].count).toBe(0);
});

it("populates the five supported categories, reuses fresh observations and retains their timestamps", async () => {
  const first = run(["--apply"]);
  expect(first.status).toBe(0);
  expect(JSON.parse(first.stdout)).toMatchObject({ attempted: 5, saved: 5, supported: 5, remaining: 0 });
  const observations = (await pool.query('SELECT "requestKey", "retrievedAt" FROM "DestinationActivityEvidence" ORDER BY "requestKey"')).rows;
  expect(observations).toHaveLength(5);
  const second = run(["--apply"], "", { TZ: "Pacific/Honolulu" });
  expect(JSON.parse(second.stdout)).toMatchObject({ attempted: 0, fresh: 5 });
  expect((await pool.query('SELECT "requestKey", "retrievedAt" FROM "DestinationActivityEvidence" ORDER BY "requestKey"')).rows).toEqual(
    observations,
  );
});

it("charges malformed responses once per day and moves past them without inventing evidence", async () => {
  const first = run(["--apply"], "malformed");
  expect(JSON.parse(first.stdout)).toMatchObject({ attempted: 5, saved: 0, failed: 5 });
  const second = run(["--apply"]);
  expect(JSON.parse(second.stdout)).toMatchObject({ attempted: 0, deferredToday: 5 });
  expect((await pool.query('SELECT "used" FROM "SearchAllowance" WHERE provider = $1', ["geoapify"])).rows[0].used).toBe(5);
});

it.each(["network", "body_network"])("stops after three consecutive %s failures", (failure) => {
  const result = run(["--apply"], failure);
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: "provider_unavailable", attempted: 3, saved: 0, failed: 3 });
});

it.each(["throttled", "credentials"])("stops immediately after a %s response", (failure) => {
  const result = run(["--apply"], failure);
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({ attempted: 1, saved: 0, failed: 1 });
});

it("reports a database disconnect during retrieval and retains the charged attempt", async () => {
  const result = run(["--apply"], "database");
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: "failed", attempted: 1, saved: 0, failed: 1 });
  expect((await pool.query('SELECT COUNT(*)::int AS count FROM "SearchReservation"')).rows[0].count).toBe(1);
});

it("honours lower operator limits rather than reducing visitor headroom", async () => {
  await pool.query(
    `INSERT INTO "SearchAllowance" (provider, "limit", used, "hourlyLimit", "expiresAt") VALUES ('geoapify', 2500, 0, 40, now() + interval '1 day')`,
  );
  const result = run(["--apply"]);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: "capacity", attempted: 0 });
  expect((await pool.query('SELECT used FROM "SearchAllowance"')).rows[0].used).toBe(0);
});

it("leaves daily visitor headroom and counts earlier manual runs towards the 150 attempt cap", async () => {
  await pool.query(
    `INSERT INTO "SearchAllowance" (provider, "limit", used, "hourlyLimit", "expiresAt") VALUES ('geoapify', 2500, 1999, 200, now() + interval '1 day')`,
  );
  expect(JSON.parse(run(["--apply"]).stdout)).toMatchObject({ status: "capacity", attempted: 1, saved: 1 });
  await pool.query('DELETE FROM "SearchReservation"');
  await pool.query('UPDATE "SearchAllowance" SET used = 150');
  await pool.query(`INSERT INTO "SearchReservation" (id, provider, "requestKey", "createdAt", "blockedUntil", background)
    SELECT 'prior-' || n, 'geoapify', 'prior-' || n, date_trunc('day', now() AT TIME ZONE 'UTC'), date_trunc('day', now() AT TIME ZONE 'UTC'), true
    FROM generate_series(1,150) AS n`);
  expect(JSON.parse(run(["--apply"]).stdout)).toMatchObject({ status: "capacity", attempted: 0 });
});

it("blocks overlapping commands without spending credits", async () => {
  const connection = await pool.connect();
  await connection.query("SELECT pg_advisory_lock(78293, 41)");
  try {
    const result = run(["--apply"]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "overlap", attempted: 0 });
  } finally {
    await connection.query("SELECT pg_advisory_unlock(78293, 41)");
    connection.release();
  }
});

it("bounds a full run to 40 missing and 10 expired queries and rotates past failures", async () => {
  await pool.query(`INSERT INTO "DestinationCandidate"
    ("id", "wikidataId", "wikivoyagePageId", "name", "countryCode", "latitude", "longitude", "sourceUrl", "sourceRevisionId", "guideStatus", "importedAt")
    SELECT 'wikidata:Q' || n, 'Q' || n, n, 'Test place ' || n, 'PT', 37 + (n - 999991) * 0.001, -8, 'https://en.wikivoyage.org/wiki/Test', 1, 'usable', now()
    FROM generate_series(999992,1000002) AS n`);
  const categories = ["entertainment.museum", "beach", "catering.bar", "adult.nightclub", "commercial.marketplace"];
  const retrievedAt = new Date("2020-01-01T00:00:00Z");
  for (const destinationId of ["wikidata:Q999991", "wikidata:Q999992"]) {
    for (const category of categories) {
      const location = { destinationId, latitude: destinationId === "wikidata:Q999991" ? 37 : 37.001, longitude: -8 };
      const requestKey = createHash("sha256")
        .update(JSON.stringify({ source: "geoapify", version: 1, ...location, category, radiusMetres: 4000, limit: 20 }))
        .digest("hex");
      const observation = {
        ...location,
        category,
        radiusMetres: 4000,
        limit: 20,
        retrievedAt: retrievedAt.toISOString(),
        coverage: "sample",
        places: [],
      };
      await pool.query(
        `INSERT INTO "DestinationActivityEvidence" ("requestKey", "destinationId", observation, "retrievedAt", "expiresAt")
        VALUES ($1,$2,$3,$4,$4)`,
        [requestKey, destinationId, JSON.stringify(observation), retrievedAt],
      );
    }
  }
  const first = run(["--apply"]);
  expect(first.status).toBe(0);
  expect(JSON.parse(first.stdout)).toMatchObject({ missing: 50, expired: 10, attempted: 50, saved: 50, remaining: 10 });
  expect(
    (await pool.query(`SELECT COUNT(*)::int AS count FROM "DestinationActivityEvidence" WHERE "retrievedAt" = $1`, [retrievedAt])).rows[0].count,
  ).toBe(0);
  const second = run(["--apply"], "malformed");
  expect(JSON.parse(second.stdout)).toMatchObject({ attempted: 10, saved: 0, failed: 10 });
  expect(JSON.parse(run(["--apply"]).stdout)).toMatchObject({ attempted: 0, deferredToday: 10 });
});

it("stops before consuming hourly visitor headroom", async () => {
  await pool.query(`INSERT INTO "SearchReservation" (id, provider, "requestKey", "createdAt", "blockedUntil")
    SELECT 'visitor-' || n, 'geoapify', 'visitor-' || n, now() - interval '10 minutes', now() - interval '9 minutes'
    FROM generate_series(1,149) AS n`);
  expect(JSON.parse(run(["--apply"]).stdout)).toMatchObject({ status: "capacity", attempted: 1, saved: 1 });
});
