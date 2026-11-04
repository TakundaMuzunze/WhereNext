import "dotenv/config";
import { Pool } from "pg";

const usage = "Usage: npm run providers:cleanup -- geoapify|geonames|travelpayouts|serpapi [--limit 1000] [--apply]. Default: preview only.";
const argumentsList = process.argv.slice(2);
const provider = argumentsList[0];
const providers = new Set(["geoapify", "geonames", "travelpayouts", "serpapi"]);
const retentionHours = 24;
const suppliedOptions = new Set();
let limit = 1000;
let apply = false;

if (!providers.has(provider)) {
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
  } else if (option === "--limit") {
    const value = argumentsList[++index] ?? "";

    if (!/^[1-9]\d*$/.test(value)) {
      throw new Error(`Limit must be an integer from 1 to 5000. ${usage}`);
    }

    limit = Number(value);
  } else {
    throw new Error(usage);
  }
}

if (limit > 5000 || !process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL and a limit from 1 to 5000 are required. ${usage}`);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
let client;

try {
  client = await pool.connect();
  await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
  await client.query("SET LOCAL statement_timeout = '5s'");
  await client.query("SET LOCAL lock_timeout = '1s'");

  const clock = await client.query(`SELECT now() AS "checkedAt", now() - interval '24 hours' AS "cutoff"`);
  const { checkedAt, cutoff } = clock.rows[0];
  const parameters = [provider, cutoff, checkedAt];
  const eligibility = `"provider" = $1 AND "createdAt" < $2 AND "blockedUntil" <= $3`;

  // Lock only obsolete records in apply mode. Overlapping runs skip each other's batch.
  const lockingClause = apply ? "FOR UPDATE SKIP LOCKED" : "";
  const candidates = await client.query(
    `SELECT "id" FROM "SearchReservation" WHERE ${eligibility}
     ORDER BY "createdAt", "id" LIMIT $4 ${lockingClause}`,
    [...parameters, limit],
  );
  const selectedIds = candidates.rows.map((reservation) => reservation.id);
  let deleted = 0;

  if (apply && selectedIds.length > 0) {
    const deletion = await client.query('DELETE FROM "SearchReservation" WHERE "id" = ANY($1::text[])', [selectedIds]);
    deleted = deletion.rowCount ?? 0;
  }

  // A bounded lookahead reports remaining work; preview skips its displayed batch.
  const remaining = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM "SearchReservation" WHERE ${eligibility}
       OFFSET $4 LIMIT 1
     ) AS "hasMore"`,
    [...parameters, apply ? 0 : selectedIds.length],
  );

  await client.query("COMMIT");
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "preview",
      provider,
      retentionHours,
      checkedAt: checkedAt.toISOString(),
      cutoff: cutoff.toISOString(),
      limit,
      matched: selectedIds.length,
      deleted,
      hasMore: remaining.rows[0].hasMore,
    }),
  );
} catch {
  if (client) {
    await client.query("ROLLBACK");
  }

  console.error("Provider reservation cleanup failed. No batch was applied. Check database access and retry.");
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
