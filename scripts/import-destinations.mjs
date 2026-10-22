import "dotenv/config";
import { Pool } from "pg";

const { fetchDestinationCandidates, candidateCountries } = await import(
  new URL("../src/features/destination-catalogue/server/fetchCandidates.ts", import.meta.url)
);

const { persistCandidates } = await import(new URL("../src/features/destination-catalogue/server/persistCandidates.ts", import.meta.url));

const commandArguments = process.argv.slice(2);
const countryCode = commandArguments[0];
const commandUsage =
  "Usage: npm run destinations:import -- PT [--limit 50] [--cursor PT:Q123] [--apply]. Countries: PT, ES, FR, IT, GR, MT. Default: preview only.";

let shouldSaveDestinations = false;
let sourceRecordLimit = 50;
let cursor = null;

if (!Object.hasOwn(candidateCountries, countryCode)) {
  throw new Error(commandUsage);
}

const suppliedOptions = new Set();

for (let argumentIndex = 1; argumentIndex < commandArguments.length; argumentIndex++) {
  const option = commandArguments[argumentIndex];

  if (suppliedOptions.has(option)) {
    throw new Error(`Option ${option} was supplied more than once. ${commandUsage}`);
  }

  suppliedOptions.add(option);

  if (option === "--apply") {
    shouldSaveDestinations = true;
    continue;
  }

  const optionValue = commandArguments[argumentIndex + 1];

  if (!optionValue || optionValue.startsWith("--")) {
    throw new Error(`Missing value for ${option}. ${commandUsage}`);
  }

  if (option === "--limit") {
    sourceRecordLimit = Number(optionValue);
  } else if (option === "--cursor") {
    cursor = optionValue;
  } else {
    throw new Error(`Unknown option ${option}. ${commandUsage}`);
  }

  argumentIndex++;
}

const userAgent = process.env.DESTINATION_IMPORT_USER_AGENT ?? "WhereNext/0.1 (https://github.com/TakundaMuzunze/WhereNext)";

if (shouldSaveDestinations && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for --apply.");
}

const importResult = await fetchDestinationCandidates(countryCode, sourceRecordLimit, userAgent, cursor);

if (shouldSaveDestinations) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await persistCandidates(pool, importResult.candidates);
    console.log(`Imported/refreshed ${importResult.candidates.length} destinations. Existing unreturned records were retained.`);
  } finally {
    await pool.end();
  }
}

// In apply mode, publish a resume cursor only once this batch has been saved.
console.log(
  JSON.stringify(
    {
      mode: shouldSaveDestinations ? "apply" : "preview",
      country: countryCode,
      cursor,
      limit: sourceRecordLimit,
      scanned: importResult.scanned,
      skipped: importResult.skipped,
      truncated: importResult.truncated,
      nextCursor: importResult.nextCursor,
      candidates: importResult.candidates.map(({ name, wikidataId, guideStatus }) => ({ name, wikidataId, guideStatus })),
    },
    null,
    2,
  ),
);
