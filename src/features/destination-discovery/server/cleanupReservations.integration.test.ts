/** @jest-environment node */
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

beforeAll(() => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.FLIGHT_TEST_DATABASE !== "disposable" || databaseUrl.hostname !== "127.0.0.1" || databaseUrl.pathname !== "/flight_test") {
    throw new Error("Use the disposable flight database runner.");
  }
});

beforeEach(async () => {
  await pool.query('DELETE FROM "SearchReservation"');
  await pool.query('DELETE FROM "SearchAllowance"');
});

afterAll(async () => {
  await pool.end();
});

function runCleanup(...argumentsList: string[]) {
  return spawnSync(process.execPath, ["scripts/cleanup-provider-reservations.mjs", ...argumentsList], {
    encoding: "utf8",
    timeout: 15000,
    env: process.env,
  });
}

it("previews obsolete reservations without changing reservations or allowance totals", async () => {
  await pool.query(`INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil")
    VALUES ('obsolete', 'geoapify', 'old-request', now() - interval '25 hours', now() - interval '24 hours')`);
  await pool.query(`INSERT INTO "SearchAllowance" ("provider", "limit", "used", "hourlyLimit", "expiresAt")
    VALUES ('geoapify', 2500, 123, 200, now() + interval '1 day')`);

  const result = runCleanup("geoapify");

  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ mode: "preview", provider: "geoapify", matched: 1, deleted: 0, hasMore: false });
  expect((await pool.query('SELECT "id" FROM "SearchReservation"')).rows).toEqual([{ id: "obsolete" }]);
  expect((await pool.query('SELECT "used" FROM "SearchAllowance"')).rows).toEqual([{ used: 123 }]);
});

it("removes only the selected provider's obsolete records and keeps every active protection", async () => {
  await pool.query(`INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil") VALUES
    ('obsolete', 'geoapify', 'old', now() - interval '25 hours', now() - interval '24 hours'),
    ('recent-history', 'geoapify', 'recent', now() - interval '23 hours', now() - interval '22 hours'),
    ('rolling-hour', 'geoapify', 'hour', now() - interval '30 minutes', now() - interval '29 minutes'),
    ('duplicate', 'geoapify', 'duplicate', now() - interval '10 seconds', now() + interval '50 seconds'),
    ('old-active-cooldown', 'geoapify', 'extended', now() - interval '25 hours', now() + interval '1 hour'),
    ('future', 'geoapify', 'future', now() + interval '1 hour', now() + interval '2 hours'),
    ('other-provider', 'geonames', 'other', now() - interval '25 hours', now() - interval '24 hours')`);
  await pool.query(`INSERT INTO "SearchAllowance" ("provider", "limit", "used", "hourlyLimit", "expiresAt")
    VALUES ('geoapify', 2500, 2500, 200, now() + interval '1 day')`);
  const allowanceBeforeCleanup = await pool.query('SELECT * FROM "SearchAllowance"');

  const result = runCleanup("geoapify", "--apply");

  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ mode: "apply", matched: 1, deleted: 1, hasMore: false, retentionHours: 24 });
  expect((await pool.query('SELECT "id" FROM "SearchReservation" ORDER BY "id"')).rows).toEqual([
    { id: "duplicate" },
    { id: "future" },
    { id: "old-active-cooldown" },
    { id: "other-provider" },
    { id: "recent-history" },
    { id: "rolling-hour" },
  ]);
  expect((await pool.query('SELECT * FROM "SearchAllowance"')).rows).toEqual(allowanceBeforeCleanup.rows);
});

it("bounds each batch and safely resumes by rerunning the same command", async () => {
  await pool.query(`INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil")
    SELECT 'obsolete-' || number, 'geoapify', 'request-' || number,
      now() - interval '30 hours' + number * interval '1 hour', now() - interval '24 hours'
    FROM generate_series(1, 3) AS number`);

  const preview = runCleanup("geoapify", "--limit", "2");
  expect(preview.status).toBe(0);
  expect(JSON.parse(preview.stdout)).toMatchObject({ matched: 2, deleted: 0, hasMore: true });

  const firstBatch = runCleanup("geoapify", "--limit", "2", "--apply");
  expect(firstBatch.status).toBe(0);
  expect(JSON.parse(firstBatch.stdout)).toMatchObject({ matched: 2, deleted: 2, hasMore: true });
  expect((await pool.query('SELECT "id" FROM "SearchReservation"')).rows).toEqual([{ id: "obsolete-3" }]);

  const secondBatch = runCleanup("geoapify", "--limit", "2", "--apply");
  expect(secondBatch.status).toBe(0);
  expect(JSON.parse(secondBatch.stdout)).toMatchObject({ matched: 1, deleted: 1, hasMore: false });

  const emptyBatch = runCleanup("geoapify", "--apply");
  expect(emptyBatch.status).toBe(0);
  expect(JSON.parse(emptyBatch.stdout)).toMatchObject({ matched: 0, deleted: 0, hasMore: false });
});

it("skips an obsolete row locked by another cleanup and reports pending work", async () => {
  await pool.query(`INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil")
    VALUES ('locked', 'geoapify', 'old-request', now() - interval '25 hours', now() - interval '24 hours')`);
  const otherCleanup = await pool.connect();

  try {
    await otherCleanup.query("BEGIN");
    await otherCleanup.query('SELECT "id" FROM "SearchReservation" WHERE "id" = \'locked\' FOR UPDATE');

    const overlappingRun = runCleanup("geoapify", "--apply");
    expect(overlappingRun.status).toBe(0);
    expect(JSON.parse(overlappingRun.stdout)).toMatchObject({ matched: 0, deleted: 0, hasMore: true });
  } finally {
    await otherCleanup.query("ROLLBACK");
    otherCleanup.release();
  }

  const retry = runCleanup("geoapify", "--apply");
  expect(retry.status).toBe(0);
  expect(JSON.parse(retry.stdout)).toMatchObject({ deleted: 1, hasMore: false });
});

it("rolls back a failed deletion batch and exits without reporting success", async () => {
  await pool.query(`INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil") VALUES
    ('first', 'geoapify', 'first', now() - interval '25 hours', now() - interval '24 hours'),
    ('second', 'geoapify', 'second', now() - interval '25 hours', now() - interval '24 hours')`);
  await pool.query(`CREATE FUNCTION reject_test_reservation_deletion() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.id = 'second' THEN
        RAISE EXCEPTION 'Simulated storage failure';
      END IF;
      RETURN OLD;
    END;
    $$`);
  await pool.query(`CREATE TRIGGER reject_test_reservation_deletion
    BEFORE DELETE ON "SearchReservation" FOR EACH ROW EXECUTE FUNCTION reject_test_reservation_deletion()`);

  try {
    const result = runCleanup("geoapify", "--apply");

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("No batch was applied");
    expect((await pool.query('SELECT "id" FROM "SearchReservation" ORDER BY "id"')).rows).toEqual([{ id: "first" }, { id: "second" }]);
  } finally {
    await pool.query('DROP TRIGGER reject_test_reservation_deletion ON "SearchReservation"');
    await pool.query("DROP FUNCTION reject_test_reservation_deletion()");
  }
});

it.each([
  [],
  ["unknown-provider", "--apply"],
  ["geoapify", "--limit", "0", "--apply"],
  ["geoapify", "--limit", "5001", "--apply"],
  ["geoapify", "--limit", "1.5", "--apply"],
  ["geoapify", "--limit"],
  ["geoapify", "--apply", "--apply"],
  ["geoapify", "--limit", "1", "--limit", "2"],
  ["geoapify", "--all-batches"],
])("rejects invalid command arguments %j", (...argumentsList) => {
  const result = runCleanup(...argumentsList);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Usage:");
  expect(result.stdout).toBe("");
});
