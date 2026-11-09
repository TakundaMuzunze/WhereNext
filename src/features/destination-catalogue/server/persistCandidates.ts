import type { Pool, PoolClient } from "pg";
import type { CandidateCountry, DestinationCandidate } from "./fetchCandidates";
import { catalogueImportLock, CatalogueImportError } from "./catalogueImportLock.ts";

type RefreshCheckpoint = {
  countryCode: CandidateCountry;
  nextCursor: string | null;
  cycleStartedAt: Date;
};

// One refresh is atomic. Stable Wikidata identity survives name/coordinate changes.
export async function persistCandidates(database: Pool | PoolClient, candidates: DestinationCandidate[], checkpoint?: RefreshCheckpoint) {
  const ownsConnection = !("release" in database);
  const databaseClient = "release" in database ? database : await database.connect();

  try {
    await databaseClient.query("BEGIN");
    await databaseClient.query("SET LOCAL statement_timeout = '10s'");
    await databaseClient.query("SET LOCAL lock_timeout = '2s'");
    const lock = await databaseClient.query<{ locked: boolean }>("SELECT pg_try_advisory_xact_lock($1, $2) AS locked", catalogueImportLock);

    if (!lock.rows[0].locked) {
      throw new CatalogueImportError("Another catalogue import is running. No records imported.");
    }

    for (const candidate of candidates) {
      const existing = await databaseClient.query<{ wikidataId: string; countryCode: string }>(
        'SELECT "wikidataId", "countryCode" FROM "DestinationCandidate" WHERE "wikivoyagePageId" = $1 OR "wikidataId" = $2 FOR UPDATE',
        [candidate.wikivoyagePageId, candidate.wikidataId],
      );

      if (existing.rows.some((row) => row.wikidataId !== candidate.wikidataId || row.countryCode !== candidate.countryCode)) {
        throw new CatalogueImportError(
          `Destination identity conflict for ${candidate.wikidataId}, page ${candidate.wikivoyagePageId}. Existing identities were retained; review page ownership and country before retrying.`,
        );
      }

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

    if (checkpoint) {
      await databaseClient.query(
        `INSERT INTO "CatalogueRefresh" ("countryCode", "cursor", "cycleStartedAt", "completedAt", "updatedAt")
         VALUES ($1, $2, $3::timestamptz AT TIME ZONE 'UTC',
           CASE WHEN $2::text IS NULL THEN CURRENT_TIMESTAMP AT TIME ZONE 'UTC' ELSE NULL END,
           CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
         ON CONFLICT ("countryCode") DO UPDATE SET
           "cursor" = EXCLUDED."cursor",
           "cycleStartedAt" = EXCLUDED."cycleStartedAt",
           "completedAt" = EXCLUDED."completedAt",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [checkpoint.countryCode, checkpoint.nextCursor, checkpoint.cycleStartedAt],
      );
    }

    await databaseClient.query("COMMIT");
  } catch (error) {
    await databaseClient.query("ROLLBACK");

    throw error;
  } finally {
    if (ownsConnection) {
      databaseClient.release();
    }
  }
}
