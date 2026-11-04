import "dotenv/config";
import { Pool } from "pg";

const { fetchDestinationImages } = await import(new URL("../src/features/destination-images/server/fetchDestinationImages.ts", import.meta.url));
const { persistDestinationImages } = await import(new URL("../src/features/destination-images/server/persistDestinationImages.ts", import.meta.url));

const usage =
  "Usage: npm run destinations:images -- PT|ES|FR|IT|GR|MT|ALL [--limit 25] [--cursor PT:Q123] [--all-batches] [--apply]. Default: preview only.";
const argumentsList = process.argv.slice(2);
const country = argumentsList[0] ?? "ALL";
const countries = new Set(["PT", "ES", "FR", "IT", "GR", "MT", "ALL"]);
let limit = 25;
let afterId = "";
let apply = false;
let allBatches = false;
const suppliedOptions = new Set();

if (!countries.has(country)) {
  throw new Error(usage);
}

for (let index = 1; index < argumentsList.length; index++) {
  const option = argumentsList[index];

  if (suppliedOptions.has(option)) {
    throw new Error(`Duplicate option. ${usage}`);
  }

  suppliedOptions.add(option);

  if (option === "--apply") {
    apply = true;
    continue;
  }

  if (option === "--all-batches") {
    allBatches = true;
    continue;
  }

  const value = argumentsList[++index];

  if (option === "--limit") {
    limit = Number(value);
  } else if (option === "--cursor") {
    const [cursorCountry, wikidataId, ...extraParts] = (value ?? "").split(":");

    if (cursorCountry !== country || !/^Q[1-9]\d*$/.test(wikidataId ?? "") || extraParts.length > 0) {
      throw new Error(`Cursor must belong to this country selection. ${usage}`);
    }

    afterId = `wikidata:${wikidataId}`;
  } else {
    throw new Error(usage);
  }
}

if (!Number.isInteger(limit) || limit < 1 || limit > 25 || !process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL and a limit from 1 to 25 are required. ${usage}`);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });

const batchPauseMs = 2000;
const userAgent = process.env.DESTINATION_IMPORT_USER_AGENT ?? "WhereNext/0.1 (https://github.com/TakundaMuzunze/WhereNext)";
let lastCompletedId = afterId;
let batchCount = 0;
let totalScanned = 0;
let totalAvailable = 0;
let totalSaved = 0;

try {
  const countryFilter = country === "ALL" ? null : country;
  const snapshot = await pool.query(
    `SELECT MAX("id") AS "lastId", COUNT(*)::int AS "total" FROM "DestinationCandidate"
     WHERE ($1::text IS NULL OR "countryCode" = $1) AND "id" > $2`,
    [countryFilter, afterId],
  );
  const finalDestinationId = snapshot.rows[0].lastId;
  const destinationCount = snapshot.rows[0].total;
  let hasAnotherBatch = destinationCount > 0;

  if (allBatches) {
    console.error(`Processing ${destinationCount} destinations in batches of ${limit}. ${apply ? "Apply" : "Preview"} mode.`);
  }

  while (hasAnotherBatch) {
    const { rows } = await pool.query(
      `SELECT "id", "name", "countryCode" FROM "DestinationCandidate"
       WHERE ($1::text IS NULL OR "countryCode" = $1) AND "id" > $2 AND "id" <= $3
       ORDER BY "id" ASC LIMIT $4`,
      [countryFilter, lastCompletedId, finalDestinationId, limit + 1],
    );
    const candidates = rows.slice(0, limit);

    if (candidates.length === 0) {
      break;
    }

    const results = await fetchDestinationImages(
      candidates.map((candidate) => candidate.id),
      userAgent,
    );
    let savedCount = 0;

    if (apply) {
      savedCount = await persistDestinationImages(pool, results);
    }

    // Advance only after the entire batch has succeeded. A restart can safely repeat any batch.
    lastCompletedId = candidates[candidates.length - 1].id;
    hasAnotherBatch = rows.length > limit;
    const availableCount = results.filter((result) => result.image).length;
    const completedCursor = `${country}:${lastCompletedId.replace("wikidata:", "")}`;
    let nextCursor = null;

    if (hasAnotherBatch) {
      nextCursor = completedCursor;
    }

    batchCount++;
    totalScanned += candidates.length;
    totalAvailable += availableCount;
    totalSaved += savedCount;

    if (!allBatches) {
      console.log(
        JSON.stringify(
          {
            mode: apply ? "apply" : "preview",
            country,
            scanned: candidates.length,
            available: availableCount,
            saved: savedCount,
            nextCursor,
            candidates: results.map((result, index) => ({ name: candidates[index].name, ...result })),
          },
          null,
          2,
        ),
      );
      break;
    }

    console.error(
      `Batch ${batchCount}: processed ${totalScanned}/${destinationCount}; ${availableCount} photos available, ${savedCount} saved. Completed cursor: ${completedCursor}`,
    );

    if (hasAnotherBatch) {
      await new Promise((resolve) => setTimeout(resolve, batchPauseMs));
    }
  }

  if (allBatches || batchCount === 0) {
    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "preview",
          country,
          batches: batchCount,
          scanned: totalScanned,
          available: totalAvailable,
          saved: totalSaved,
          nextCursor: null,
        },
        null,
        2,
      ),
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Image enrichment failed.");
  console.error(`Stopped after ${batchCount} completed batches. Earlier saved batches are retained.`);
  const resumeArguments = [country, "--limit", String(limit)];

  if (allBatches) {
    resumeArguments.push("--all-batches");
  }

  if (lastCompletedId) {
    resumeArguments.push("--cursor", `${country}:${lastCompletedId.replace("wikidata:", "")}`);
  }

  if (apply) {
    resumeArguments.push("--apply");
  }

  console.error(`Resume with: npm run destinations:images -- ${resumeArguments.join(" ")}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
