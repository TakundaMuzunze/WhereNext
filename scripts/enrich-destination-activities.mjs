import "dotenv/config";
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { Pool, types } from "pg";
import { z } from "zod";
import { destinations } from "../src/shared/data/destinations.ts";
import { initialActivities, activityCategory } from "../src/features/destination-activities/lib/activityCategories.ts";
import { assessActivity } from "../src/features/destination-activities/lib/assessActivity.ts";
import {
  activityObservationKey,
  validateCachedObservation,
  translateObservation,
  reuseSeconds,
  radiusMetres,
  resultLimit,
} from "../src/features/destination-activities/server/activityObservation.ts";
import { reserveProvider, ProviderCapacityError } from "../src/features/destination-discovery/server/reserveProvider.ts";
import { catalogueDatabaseUrl } from "../src/features/destination-catalogue/server/catalogueImportLock.ts";

const args = process.argv.slice(2);
const apply = args.length === 1 && args[0] === "--apply";
if (args.length > 0 && !apply) throw new Error("Usage: npm run destinations:activities -- [--apply]. Default: preview only.");

const report = {
  mode: apply ? "apply" : "preview",
  status: "complete",
  missing: 0,
  expired: 0,
  fresh: 0,
  deferredToday: 0,
  skippedLocations: 0,
  planned: 0,
  attempted: 0,
  saved: 0,
  supported: 0,
  failed: 0,
  remaining: 0,
};
const pool = new Pool({
  application_name: "where-next-activity-enrichment",
  connectionString: catalogueDatabaseUrl(),
  connectionTimeoutMillis: 10000,
  query_timeout: 15000,
  max: 1,
  // Prisma stores timestamp-without-time-zone values as UTC, including when the
  // command runs on a developer's computer in a different local timezone.
  types: {
    getTypeParser(oid, format) {
      return oid === 1114 ? (value) => new Date(`${value}Z`) : types.getTypeParser(oid, format);
    },
  },
});
const client = await pool.connect();
let locked = false;
let connectionError;
const onConnectionError = (error) => {
  connectionError = error;
};
client.on("error", onConnectionError);

try {
  const lock = await client.query("SELECT pg_try_advisory_lock(78293, 41) AS locked");
  locked = lock.rows[0].locked;
  if (!locked) throw new Error("overlap");

  const clock = await client.query("SELECT clock_timestamp() AS now");
  const now = clock.rows[0].now;
  const day = now.toISOString().slice(0, 10);
  const candidateSchema = z.object({
    id: z.string(),
    wikidataId: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  });
  const candidates = z.array(candidateSchema).parse((await client.query('SELECT * FROM "DestinationCandidate" ORDER BY "id"')).rows);
  const links = (await client.query('SELECT * FROM "DestinationGuideIdentity"')).rows;
  const guideIds = new Set(destinations.map((destination) => destination.id));
  const canonical = new Map(
    links.filter((link) => guideIds.has(link.legacyDestinationId)).map((link) => [link.wikidataId, link.legacyDestinationId]),
  );
  const stored = new Map((await client.query('SELECT * FROM "DestinationActivityEvidence"')).rows.map((row) => [row.requestKey, row]));
  const attempts = new Map((await client.query('SELECT * FROM "ActivityEnrichmentAttempt"')).rows.map((row) => [row.requestKey, row.attemptedAt]));
  const missing = [];
  const expired = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const destinationId = canonical.get(candidate.wikidataId) ?? candidate.id;
    // A legacy guide with multiple imported centres needs a geography decision.
    if (canonical.has(candidate.wikidataId) && candidates.filter((other) => canonical.get(other.wikidataId) === destinationId).length !== 1) {
      report.skippedLocations++;
      continue;
    }
    const location = { destinationId, latitude: candidate.latitude, longitude: candidate.longitude };
    for (const activity of initialActivities) {
      const category = activityCategory(activity);
      const requestKey = activityObservationKey(location, category);
      if (seen.has(requestKey)) continue;
      seen.add(requestKey);
      const row = stored.get(requestKey);
      const observation = row ? validateCachedObservation(row, location, category) : null;
      if (observation && row.expiresAt > now && now.getTime() - Date.parse(observation.retrievedAt) < reuseSeconds * 1000) {
        report.fresh++;
        continue;
      }
      const group = observation ? expired : missing;
      report[observation ? "expired" : "missing"]++;
      const attemptedAt = attempts.get(requestKey);
      if (attemptedAt?.toISOString().slice(0, 10) === day) {
        report.deferredToday++;
        continue;
      }
      group.push({
        location,
        activity,
        category,
        requestKey,
        priority: attemptedAt?.getTime() ?? 0,
        retrievedAt: observation ? Date.parse(observation.retrievedAt) : 0,
      });
    }
  }

  const order = (a, b) => a.priority - b.priority || a.retrievedAt - b.retrievedAt || a.requestKey.localeCompare(b.requestKey);
  missing.sort(order);
  expired.sort(order);
  const work = [];
  // Four missing slots followed by one expired slot. Spare slots transfer groups.
  while (work.length < 50 && (missing.length || expired.length)) {
    const preferred = work.length % 5 === 4 ? expired : missing;
    const fallback = preferred === missing ? expired : missing;
    work.push((preferred.length ? preferred : fallback).shift());
  }
  report.planned = work.length;
  report.remaining = report.missing + report.expired;

  if (apply && (process.env.ACTIVITY_EVIDENCE_ENABLED !== "true" || !process.env.GEOAPIFY_API_KEY)) {
    throw new Error("configuration");
  }

  let consecutiveFailures = 0;
  for (const item of apply ? work : []) {
    if (connectionError) throw connectionError;
    // Stop at UTC rollover; the next run plans against the new day's work.
    if (new Date().toISOString().slice(0, 10) !== day) {
      report.status = "day_changed";
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    const url = new URL("https://api.geoapify.com/v2/places");
    url.search = new URLSearchParams({
      categories: item.category,
      filter: `circle:${item.location.longitude},${item.location.latitude},${radiusMetres}`,
      bias: `proximity:${item.location.longitude},${item.location.latitude}`,
      limit: String(resultLimit),
      apiKey: process.env.GEOAPIFY_API_KEY,
    }).toString();
    // Match the visitor guard's URL identity and cooldown.
    const providerKey = createHash("sha256").update(url.toString()).update("{}").digest("hex");
    await client.query("BEGIN");
    try {
      const current = (await client.query('SELECT * FROM "DestinationActivityEvidence" WHERE "requestKey" = $1', [item.requestKey])).rows[0];
      const valid = current && validateCachedObservation(current, item.location, item.category);
      if (valid && current.expiresAt > new Date() && Date.now() - Date.parse(valid.retrievedAt) < reuseSeconds * 1000) {
        await client.query("ROLLBACK");
        continue;
      }
      await reserveProvider(
        async (sql, values) =>
          (
            await client.query(
              sql,
              values.map((value) => (value instanceof Date ? value.toISOString() : value)),
            )
          ).rows,
        "geoapify",
        providerKey,
        item.requestKey,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ProviderCapacityError) {
        report.status = "capacity";
        break;
      }
      throw error;
    }
    report.attempted++;
    let response;
    try {
      response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
    } catch {
      report.failed++;
      if (++consecutiveFailures >= 3) {
        report.status = "provider_unavailable";
        break;
      }
      continue;
    }
    if ([401, 403, 429].includes(response.status)) {
      report.failed++;
      report.status = response.status === 429 ? "throttled" : "credentials_rejected";
      break;
    }
    if (!response.ok) {
      report.failed++;
      consecutiveFailures = response.status >= 500 ? consecutiveFailures + 1 : 0;
      if (consecutiveFailures >= 3) {
        report.status = "provider_unavailable";
        break;
      }
      continue;
    }
    let observation;
    let body;
    try {
      body = await response.json();
    } catch (error) {
      report.failed++;
      consecutiveFailures = error instanceof SyntaxError ? 0 : consecutiveFailures + 1;
      if (consecutiveFailures >= 3) {
        report.status = "provider_unavailable";
        break;
      }
      continue;
    }
    try {
      observation = translateObservation(body, item.location, item.category, new Date().toISOString());
      consecutiveFailures = 0;
    } catch {
      report.failed++;
      consecutiveFailures = 0;
      continue;
    }
    // Storage errors stop the run. A failed write never overwrites earlier evidence.
    const retrievedAt = new Date(observation.retrievedAt);
    await client.query(
      `INSERT INTO "DestinationActivityEvidence" ("requestKey", "destinationId", "observation", "retrievedAt", "expiresAt")
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("requestKey") DO UPDATE SET
      "observation" = EXCLUDED."observation", "retrievedAt" = EXCLUDED."retrievedAt", "expiresAt" = EXCLUDED."expiresAt"`,
      [
        item.requestKey,
        item.location.destinationId,
        JSON.stringify(observation),
        retrievedAt.toISOString(),
        new Date(retrievedAt.getTime() + reuseSeconds * 1000).toISOString(),
      ],
    );
    report.saved++;
    if (assessActivity(item.activity, observation).status === "supported") report.supported++;
    report.remaining--;
  }
} catch {
  report.status = locked ? "failed" : "overlap";
  report.failed = Math.max(report.failed, report.attempted - report.saved);
  process.exitCode = 1;
  console.error(
    "Activity enrichment stopped. Check database access, the enrichment migration and explicit activity enablement. Earlier evidence and charged attempts are retained.",
  );
} finally {
  try {
    if (locked && !connectionError) await client.query("SELECT pg_advisory_unlock(78293, 41)");
  } catch (error) {
    connectionError = error;
    report.status = "failed";
    process.exitCode = 1;
  } finally {
    client.removeListener("error", onConnectionError);
    client.release(connectionError);
    await pool.end();
  }
}

if (["provider_unavailable", "credentials_rejected", "throttled"].includes(report.status)) process.exitCode = 1;
console.log(JSON.stringify(report));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## Activity enrichment (${report.mode})\n\nStatus: ${report.status}. Attempts: ${report.attempted}/50. Stored: ${report.saved}. Supported assessments: ${report.supported}. Failures: ${report.failed}.\n\nFresh observations: ${report.fresh}. Missing: ${report.missing}. Expired: ${report.expired}. Remaining due: ${report.remaining}. Deferred today: ${report.deferredToday}.\n\nUnknown evidence remains unknown. Capacity stops retain work for a later run.\n`,
  );
}
