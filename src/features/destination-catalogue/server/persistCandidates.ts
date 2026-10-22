import type { Pool } from "pg";
import type { DestinationCandidate } from "./fetchCandidates";

// One refresh is atomic. Stable Wikidata identity survives name/coordinate changes.
export async function persistCandidates(pool: Pool, candidates: DestinationCandidate[]) {
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query("BEGIN");

    for (const candidate of candidates) {
      await databaseClient.query(
        `INSERT INTO "DestinationCandidate" (
          "id",
          "wikidataId",
          "wikivoyagePageId",
          "name",
          "countryCode",
          "latitude",
          "longitude",
          "sourceUrl",
          "sourceRevisionId",
          "guideStatus",
          "importedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT ("wikidataId") DO UPDATE SET
          "wikivoyagePageId" = EXCLUDED."wikivoyagePageId",
          "name" = EXCLUDED."name",
          "countryCode" = EXCLUDED."countryCode",
          "latitude" = EXCLUDED."latitude",
          "longitude" = EXCLUDED."longitude",
          "sourceUrl" = EXCLUDED."sourceUrl",
          "sourceRevisionId" = EXCLUDED."sourceRevisionId",
          "guideStatus" = EXCLUDED."guideStatus",
          "importedAt" = EXCLUDED."importedAt"`,
        [
          candidate.id,
          candidate.wikidataId,
          candidate.wikivoyagePageId,
          candidate.name,
          candidate.countryCode,
          candidate.latitude,
          candidate.longitude,
          candidate.sourceUrl,
          candidate.sourceRevisionId,
          candidate.guideStatus,
          candidate.importedAt,
        ],
      );
    }

    await databaseClient.query("COMMIT");
  } catch (error) {
    await databaseClient.query("ROLLBACK");

    throw error;
  } finally {
    databaseClient.release();
  }
}
