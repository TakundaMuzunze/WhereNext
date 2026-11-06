import "dotenv/config";
import { Pool } from "pg";
import { climateLocation } from "../src/features/destination-seasons/model/climateObservation.ts";
import { reusableClimate } from "../src/features/destination-seasons/model/storedClimate.ts";
import { fetchClimate } from "../src/features/destination-seasons/server/fetchClimate.ts";
import { persistClimate } from "../src/features/destination-seasons/server/persistClimate.ts";

const usage = "Usage: npm run destinations:climate -- [--limit 25] [--cursor wikidata:Q123] [--all-batches] [--apply]. Default: preview only.";
const argumentsList = process.argv.slice(2);
const suppliedOptions = new Set();
let limit = 25;
let cursor = "";
let apply = false;
let allBatches = false;

for (let index = 0; index < argumentsList.length; index++) {
  const option = argumentsList[index];

  if (suppliedOptions.has(option)) {
    throw new Error(`Duplicate option. ${usage}`);
  }

  suppliedOptions.add(option);

  if (option === "--apply") {
    apply = true;
  } else if (option === "--all-batches") {
    allBatches = true;
  } else if (option === "--limit") {
    const value = argumentsList[++index] ?? "";
    if (!/^[1-9]\d*$/.test(value)) {
      throw new Error(usage);
    }
    limit = Number(value);
  } else if (option === "--cursor") {
    cursor = argumentsList[++index] ?? "";
    if (!/^wikidata:Q[1-9]\d*$/.test(cursor)) {
      throw new Error(usage);
    }
  } else {
    throw new Error(usage);
  }
}

if (limit > 50 || !process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL and a limit from 1 to 50 are required. ${usage}`);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const checkedCells = new Set();
let scanned = 0;
let fetched = 0;
let reused = 0;
let hasMore = false;
let stage = "reading the destination catalogue";

try {
  const snapshot = await pool.query('SELECT MAX("id") AS "lastId" FROM "DestinationCandidate"');
  const lastId = snapshot.rows[0].lastId;

  while (lastId) {
    stage = "reading the destination catalogue";
    const page = await pool.query(
      `SELECT "id", "latitude", "longitude" FROM "DestinationCandidate"
       WHERE "id" > $1 AND "id" <= $2 ORDER BY "id" LIMIT $3`,
      [cursor, lastId, limit + 1],
    );
    const candidates = page.rows.slice(0, limit);
    hasMore = page.rows.length > limit;

    for (const candidate of candidates) {
      const location = climateLocation(candidate.latitude, candidate.longitude);

      if (!checkedCells.has(location.requestKey)) {
        stage = "reading stored climate evidence";
        const stored = await pool.query('SELECT * FROM "SeasonalClimate" WHERE "requestKey" = $1', [location.requestKey]);
        const cached = stored.rows[0] ? reusableClimate(stored.rows[0]) : null;

        if (cached) {
          reused++;
        } else {
          // One request at a time, no retries, with a pause between source cells.
          if (fetched > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          stage = "retrieving and validating NASA climate evidence";
          const observation = await fetchClimate(location.latitude, location.longitude);

          if (apply) {
            stage = "saving climate evidence";
            await persistClimate(pool, observation);
          }

          fetched++;
        }

        checkedCells.add(location.requestKey);
      }

      scanned++;
      cursor = candidate.id;
    }

    console.error(`Climate ${apply ? "apply" : "preview"}: ${scanned} destinations, ${fetched} fetched cells, ${reused} reused cells.`);

    if (!allBatches || !hasMore) {
      break;
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", scanned, fetched, reused, hasMore, nextCursor: hasMore ? cursor : null }));
} catch (error) {
  const errorName = error instanceof Error ? error.name : "unknown";
  const errorCode = typeof error?.code === "string" ? error.code : error?.cause?.code;
  const safeCode = typeof errorCode === "string" && /^[A-Z0-9_]+$/.test(errorCode) ? `, ${errorCode}` : "";
  console.error(`Climate enrichment failed while ${stage} (${errorName}${safeCode}).`);
  console.error(`Climate enrichment failed. Earlier saved cells remain intact. Resume with --cursor ${cursor || "(omit for the first record)"}.`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
