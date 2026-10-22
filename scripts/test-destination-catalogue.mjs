import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Never use the project's database connection: this runner creates its own.
const name = `where-next-catalogue-test-${randomUUID()}`;

const password = randomUUID();

function docker(args, input) {
  const result = spawnSync("docker", args, { input, encoding: "utf8", timeout: 120_000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim());
  return result.stdout.trim();
}

let started = false;

try {
  docker(["info", "--format", "{{.ServerVersion}}"]);
  docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "-p",
    "127.0.0.1::5432",
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-e",
    "POSTGRES_DB=catalogue_test",
    "postgres:17",
  ]);

  started = true;
  let ready = false;

  for (let attempt = 0; attempt < 60; attempt++) {
    // TCP becomes ready only after the image's temporary initialization server stops.
    const result = spawnSync("docker", ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "catalogue_test"], { timeout: 5000 });
    if (result.status === 0) {
      ready = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!ready) throw new Error("Temporary Postgres did not become ready.");

  const migrationsRoot = new URL("../prisma/migrations/", import.meta.url);

  const sql = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((entry) => readFileSync(new URL(`${entry}/migration.sql`, migrationsRoot), "utf8"))
    .join("\n");
  docker(["exec", "-i", name, "psql", "-U", "postgres", "-d", "catalogue_test", "-v", "ON_ERROR_STOP=1"], sql);
  const binding = docker(["port", name, "5432/tcp"]);
  const port = /^127\.0\.0\.1:(\d+)$/.exec(binding)?.[1];
  if (!port) throw new Error("Could not identify isolated Postgres port.");
  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${port}/catalogue_test`;
  console.log("Testing destination catalogue imports against disposable Postgres.");
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/jest/bin/jest.js",
      "--runInBand",
      "--runTestsByPath",
      "src/features/destination-catalogue/server/persistCandidates.integration.test.ts",
      "--testPathIgnorePatterns=/e2e/",
    ],
    {
      stdio: "inherit",
      timeout: 120_000,
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, CATALOGUE_TEST_DATABASE: "disposable" },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Catalogue integration tests failed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (started) {
    try {
      docker(["stop", name]);
      console.log("Removed disposable catalogue test database.");
    } catch (error) {
      console.error(`Cleanup failed for ${name}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
