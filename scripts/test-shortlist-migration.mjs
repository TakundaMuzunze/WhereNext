import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// This test deliberately never reads DATABASE_URL or the project's .env files.
const containerName = `where-next-migration-test-${randomUUID()}`;
const projectRoot = new URL("../", import.meta.url);
const migration = (name) => readFileSync(new URL(`prisma/migrations/${name}/migration.sql`, projectRoot), "utf8");

function docker(args, input) {
  const result = spawnSync("docker", args, { input, encoding: "utf8", timeout: 120_000 });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr.trim() ?? "Docker command failed");
  }
  return result.stdout;
}

function sql(statement, database = "postgres") {
  return docker(["exec", "-i", containerName, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1"], statement);
}

const priorSchema = migration("20260929220600_init") + "\n" + migration("20261001211107_add_better_auth");
const shortlistMigration = migration("20261015205739_add_shortlists");
let started = false;
try {
  docker(["info", "--format", "{{.ServerVersion}}"]);
  console.log("Starting disposable Postgres 17 (first run may download the official image).");
  docker(["run", "--detach", "--rm", "--name", containerName, "--network", "none", "-e", `POSTGRES_PASSWORD=${randomUUID()}`, "postgres:17"]);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const check = spawnSync("docker", ["exec", containerName, "pg_isready", "-U", "postgres"], { encoding: "utf8", timeout: 5000 });
    if (check.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Temporary Postgres did not become ready.");

  sql(priorSchema);
  sql(`
    INSERT INTO "User" (id, name, email, "updatedAt") VALUES
      ('alice', 'Alice', 'alice@example.test', NOW()),
      ('bob', 'Bob', 'bob@example.test', NOW()),
      ('empty', 'No saves', 'empty@example.test', NOW());
    INSERT INTO "SavedDestination" (id, "userId", "destinationId") VALUES
      ('save-1', 'alice', 'lisbon-portugal'),
      ('save-2', 'alice', 'porto-portugal'),
      ('save-3', 'bob', 'lisbon-portugal');
    CREATE TABLE original_saves AS TABLE "SavedDestination";
  `);
  sql(shortlistMigration);
  sql(`
    DO $$ BEGIN
      IF (SELECT count(*) FROM "Shortlist") <> 2 THEN
        RAISE EXCEPTION 'Expected exactly one shortlist per owner with saves';
      END IF;
      IF EXISTS (SELECT 1 FROM "Shortlist" WHERE "userId" = 'empty' OR "shortlistName" <> 'Saved places') THEN
        RAISE EXCEPTION 'Unexpected owner or default name';
      END IF;
      IF EXISTS (SELECT "userId" FROM "Shortlist" GROUP BY "userId" HAVING count(*) <> 1) THEN
        RAISE EXCEPTION 'Duplicate default collections';
      END IF;
      IF EXISTS (
        (SELECT "userId", "destinationId" FROM original_saves
         EXCEPT SELECT s."userId", i."destinationId" FROM "ShortlistItem" i JOIN "Shortlist" s ON s.id = i."shortlistId")
        UNION ALL
        (SELECT s."userId", i."destinationId" FROM "ShortlistItem" i JOIN "Shortlist" s ON s.id = i."shortlistId"
         EXCEPT SELECT "userId", "destinationId" FROM original_saves)
      ) OR (SELECT count(*) FROM "ShortlistItem") <> 3 THEN
        RAISE EXCEPTION 'Migrated memberships do not match original owners/destinations';
      END IF;
      IF EXISTS (
        (TABLE original_saves EXCEPT TABLE "SavedDestination")
        UNION ALL (TABLE "SavedDestination" EXCEPT TABLE original_saves)
      ) THEN RAISE EXCEPTION 'Original saves changed'; END IF;
      BEGIN
        INSERT INTO "Shortlist" (id, "userId", "shortlistName") VALUES ('duplicate-name', 'alice', 'SAVED PLACES');
        RAISE EXCEPTION 'Case-insensitive duplicate was accepted';
      EXCEPTION WHEN unique_violation THEN NULL; END;
      BEGIN
        INSERT INTO "ShortlistItem" (id, "shortlistId", "destinationId") VALUES ('duplicate-item', 'migrated-shortlist-alice', 'lisbon-portugal');
        RAISE EXCEPTION 'Duplicate membership was accepted';
      EXCEPTION WHEN unique_violation THEN NULL; END;
      BEGIN
        INSERT INTO "ShortlistItem" (id, "shortlistId", "destinationId") VALUES ('orphan-item', 'missing-list', 'lisbon-portugal');
        RAISE EXCEPTION 'Missing parent was accepted';
      EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    END $$;
    BEGIN;
    DELETE FROM "Shortlist" WHERE "userId" = 'alice';
    DO $$ BEGIN
      IF (SELECT count(*) FROM "ShortlistItem") <> 1
        OR NOT EXISTS (SELECT 1 FROM "ShortlistItem" WHERE id = 'save-3') THEN
        RAISE EXCEPTION 'Shortlist deletion did not isolate membership cleanup';
      END IF;
      IF (SELECT count(*) FROM "SavedDestination") <> 3 THEN
        RAISE EXCEPTION 'Shortlist deletion affected legacy saves';
      END IF;
    END $$;
    ROLLBACK;
  `);
  console.log("PASS: data preservation, owner mapping, empty users, uniqueness, foreign keys, and cascade isolation.");

  sql("CREATE DATABASE empty_fixture;");
  sql(priorSchema, "empty_fixture");
  sql(shortlistMigration, "empty_fixture");
  sql(
    `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM "Shortlist") OR EXISTS (SELECT 1 FROM "ShortlistItem") THEN
      RAISE EXCEPTION 'An empty database received default collections';
    END IF;
  END $$;`,
    "empty_fixture",
  );
  console.log("PASS: migration also works with no existing saves.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Test did not pass. If Docker is not running, start Docker Desktop and retry.");
  process.exitCode = 1;
} finally {
  if (started) {
    try {
      docker(["stop", containerName]);
      console.log("Removed disposable test container and database.");
    } catch (error) {
      console.error(`Cleanup failed for ${containerName}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
