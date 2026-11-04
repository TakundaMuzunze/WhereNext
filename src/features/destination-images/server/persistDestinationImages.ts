import type { Pool } from "pg";
import { destinationImageSchema } from "../../../entities/destination/model/destinationImage.ts";
import type { DestinationImageResult } from "./fetchDestinationImages";

// Empty/unusable results do not erase previous photos. A failed batch rolls back as a whole.
export async function persistDestinationImages(pool: Pool, results: DestinationImageResult[]): Promise<number> {
  const client = await pool.connect();
  let savedCount = 0;

  try {
    await client.query("BEGIN");

    for (const result of results) {
      if (!result.image) {
        continue;
      }

      const image = destinationImageSchema.parse(result.image);
      await client.query(
        `INSERT INTO "DestinationImage" ("destinationId", "image", "retrievedAt")
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT ("destinationId") DO UPDATE SET
           "image" = EXCLUDED."image",
           "retrievedAt" = EXCLUDED."retrievedAt"`,
        [result.destinationId, JSON.stringify(image)],
      );
      savedCount++;
    }

    await client.query("COMMIT");
    return savedCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
