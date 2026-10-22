import "dotenv/config";
import { Pool } from "pg";

const { fetchDestinationCandidates, candidateCountries } = await import(
  new URL("../src/features/destination-catalogue/server/fetchCandidates.ts", import.meta.url)
);

const { persistCandidates } = await import(new URL("../src/features/destination-catalogue/server/persistCandidates.ts", import.meta.url));

const commandArguments = process.argv.slice(2);

const countryCode = commandArguments[0];

const shouldSaveDestinations = commandArguments.includes("--apply");

const isSupportedCountry = Object.hasOwn(candidateCountries, countryCode);
const hasUnknownOptions = commandArguments.slice(1).some((argument) => argument !== "--apply");

if (!isSupportedCountry || hasUnknownOptions) {
  throw new Error("Usage: npm run destinations:import -- PT [--apply]. Countries: PT, ES, FR, IT, GR, MT. Default: preview only.");
}

const userAgent = process.env.DESTINATION_IMPORT_USER_AGENT ?? "WhereNext/0.1 (https://github.com/TakundaMuzunze/WhereNext)";

if (shouldSaveDestinations && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for --apply.");
}

const importResult = await fetchDestinationCandidates(countryCode, 50, userAgent);

console.log(
  JSON.stringify(
    {
      mode: shouldSaveDestinations ? "apply" : "preview",
      country: countryCode,
      scanned: importResult.scanned,
      skipped: importResult.skipped,
      truncated: importResult.truncated,
      candidates: importResult.candidates.map(({ name, wikidataId, guideStatus }) => ({ name, wikidataId, guideStatus })),
    },
    null,
    2,
  ),
);

if (shouldSaveDestinations) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await persistCandidates(pool, importResult.candidates);
    console.log(`Imported/refreshed ${importResult.candidates.length} destinations. Existing unreturned records were retained.`);
  } finally {
    await pool.end();
  }
}
