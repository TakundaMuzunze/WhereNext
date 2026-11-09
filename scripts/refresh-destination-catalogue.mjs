import "dotenv/config";
import { appendFileSync } from "node:fs";
import { Pool } from "pg";
import { z } from "zod";
import { candidateCountries, fetchDestinationCandidates } from "../src/features/destination-catalogue/server/fetchCandidates.ts";
import {
  catalogueDatabaseUrl,
  withCatalogueImportLock,
  CatalogueImportError,
} from "../src/features/destination-catalogue/server/catalogueImportLock.ts";
import { persistCandidates } from "../src/features/destination-catalogue/server/persistCandidates.ts";

const usage = "Usage: npm run destinations:refresh -- [ALL|PT|ES|FR|IT|GR|MT] [--max-pages 2] [--apply]. Default: preview only.";
const argumentsList = process.argv.slice(2);
const selectedCountry = argumentsList[0] && !argumentsList[0].startsWith("--") ? argumentsList.shift() : "ALL";
let apply = false;
let maximumPages = 2;
const suppliedOptions = new Set();

if (selectedCountry !== "ALL" && !Object.hasOwn(candidateCountries, selectedCountry)) {
  throw new Error(usage);
}

for (let index = 0; index < argumentsList.length; index++) {
  const option = argumentsList[index];
  if (suppliedOptions.has(option)) throw new Error(usage);
  suppliedOptions.add(option);

  if (option === "--apply") {
    apply = true;
  } else if (option === "--max-pages") {
    const value = argumentsList[++index] ?? "";
    if (!/^[1-5]$/.test(value)) throw new Error(usage);
    maximumPages = Number(value);
  } else {
    throw new Error(usage);
  }
}

const mode = apply ? "apply" : "preview";
const countries = selectedCountry === "ALL" ? Object.keys(candidateCountries) : [selectedCountry];
const pool = new Pool({ connectionString: catalogueDatabaseUrl(), connectionTimeoutMillis: 10000, query_timeout: 15000, max: 1 });
const reports = [];
const userAgent = process.env.DESTINATION_IMPORT_USER_AGENT ?? "WhereNext/0.1 (https://github.com/TakundaMuzunze/WhereNext)";
let failed = false;
let sourcePages = 0;
let stage = "acquiring the catalogue import lock";

try {
  await withCatalogueImportLock(pool, async (client) => {
    const clock = await client.query("SELECT CURRENT_TIMESTAMP AS now");
    const now = clock.rows[0].now;

    for (const country of countries) {
      const report = { country, pages: 0, scanned: 0, skipped: 0, saved: 0, status: "pending", nextCursor: null };
      reports.push(report);
      stage = `${country}: reading the refresh checkpoint`;
      const stored = await client.query(
        `SELECT "cursor", "cycleStartedAt" AT TIME ZONE 'UTC' AS "cycleStartedAt",
         "completedAt" AT TIME ZONE 'UTC' AS "completedAt" FROM "CatalogueRefresh" WHERE "countryCode" = $1`,
        [country],
      );
      const escapedCountry = country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const checkpointSchema = z.object({
        cursor: z
          .string()
          .regex(new RegExp(`^${escapedCountry}:Q[1-9]\\d*$`))
          .nullable(),
        cycleStartedAt: z.date(),
        completedAt: z.date().nullable(),
      });
      const checkpoint = stored.rows[0] ? checkpointSchema.parse(stored.rows[0]) : null;

      if (checkpoint?.completedAt?.toISOString().slice(0, 7) === now.toISOString().slice(0, 7)) {
        report.status = "not_due";
        continue;
      }

      const cycleStartedAt = checkpoint && !checkpoint.completedAt ? checkpoint.cycleStartedAt : now;
      let cursor = checkpoint?.completedAt ? null : (checkpoint?.cursor ?? null);
      report.nextCursor = cursor;

      for (let page = 0; page < maximumPages; page++) {
        if (sourcePages > 0) {
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
        sourcePages++;
        stage = `${country}: retrieving source page ${report.pages + 1}`;
        const batch = await fetchDestinationCandidates(country, 50, userAgent, cursor);

        if (apply) {
          stage = `${country}: saving source page ${report.pages + 1}`;
          await persistCandidates(client, batch.candidates, { countryCode: country, nextCursor: batch.nextCursor, cycleStartedAt });
          report.saved += batch.candidates.length;
        }

        report.pages++;
        report.scanned += batch.scanned;
        report.skipped += batch.skipped;
        report.nextCursor = batch.nextCursor;
        cursor = batch.nextCursor;

        if (!batch.truncated) {
          report.status = "complete";
          break;
        }
      }
      console.error(`${country}: ${report.status}, ${report.scanned} source records scanned.`);
    }
  });
} catch (error) {
  failed = true;
  const currentReport = reports.at(-1);
  if (currentReport) currentReport.status = "failed";
  const errorName = error instanceof Error ? error.name : "unknown";
  const sourceCode = error?.code ?? error?.cause?.code;
  const errorCode = typeof sourceCode === "string" && /^[A-Z0-9_]+$/.test(sourceCode) ? sourceCode : "unknown";
  const reason = error instanceof CatalogueImportError ? error.message : `${errorName}, code ${errorCode}`;
  console.error(`Catalogue refresh failed while ${stage}: ${reason} Earlier committed pages and the last saved cursor are retained.`);
} finally {
  await pool.end();
}

const notRun = countries.filter((country) => !reports.some((report) => report.country === country));

console.log(
  JSON.stringify({
    mode,
    maximumPages,
    failed,
    countries: reports,
    notRun,
  }),
);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = reports.map(
    (report) =>
      `| ${report.country} | ${report.status} | ${report.pages} | ${report.scanned} | ${report.saved} | ${report.skipped} | ${report.nextCursor ?? "—"} |`,
  );
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `## Catalogue refresh (${mode})`,
      "",
      "| Country | Status | Pages | Scanned | Saved | Skipped | Next cursor |",
      "| --- | --- | ---: | ---: | ---: | ---: | --- |",
      ...rows,
      ...notRun.map((country) => `| ${country} | not_run | 0 | 0 | 0 | 0 | — |`),
      "",
      "Pending countries resume in the next bounded run. Missing places are retained; identity changes require review.",
      "",
    ].join("\n"),
  );
}

if (failed) process.exitCode = 1;
