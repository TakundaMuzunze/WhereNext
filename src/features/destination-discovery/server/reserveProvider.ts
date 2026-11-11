import { randomUUID } from "node:crypto";
import { z } from "zod";

export type Provider = "travelpayouts" | "geonames" | "geoapify";
export type ReservationQuery = (sql: string, values: unknown[]) => Promise<unknown[]>;

const budgets: Record<Provider, { daily: number; hourly: number }> = {
  travelpayouts: { daily: 5000, hourly: 300 },
  geonames: { daily: 8000, hourly: 800 },
  geoapify: { daily: 2500, hourly: 200 },
};

export class ProviderCapacityError extends Error {}

// The caller owns the transaction. Locking the allowance serializes every caller,
// including visitor requests and background commands on other instances.
export async function reserveProvider(query: ReservationQuery, provider: Provider, key: string, backgroundKey?: string): Promise<void> {
  const budget = budgets[provider];
  await query(
    `INSERT INTO "SearchAllowance" ("provider", "limit", "used", "hourlyLimit", "expiresAt")
    VALUES ($1, $2, 0, $3, $4) ON CONFLICT ("provider") DO NOTHING`,
    [provider, budget.daily, budget.hourly, new Date(0)],
  );
  const [allowance] = await query('SELECT * FROM "SearchAllowance" WHERE "provider" = $1 FOR UPDATE', [provider]);
  const row = z.object({ limit: z.number(), hourlyLimit: z.number(), used: z.number(), expiresAt: z.date() }).parse(allowance);
  const [clock] = await query("SELECT clock_timestamp() AS now", []);
  const { now } = z.object({ now: z.date() }).parse(clock);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const reset = row.expiresAt <= now;
  const used = reset ? 0 : row.used;
  const [usage] = await query(
    `SELECT
    COUNT(*) FILTER (WHERE "createdAt" > $2)::int AS hourly,
    COUNT(*) FILTER (WHERE "createdAt" > $3)::int AS recent,
    COUNT(*) FILTER (WHERE "requestKey" = $4 AND "blockedUntil" > $5)::int AS duplicate
    FROM "SearchReservation" WHERE "provider" = $1`,
    [provider, new Date(now.getTime() - 3_600_000), new Date(now.getTime() - 1000), key, now],
  );
  const counts = z.object({ hourly: z.number(), recent: z.number(), duplicate: z.number() }).parse(usage);
  const dailyLimit = row.limit - (backgroundKey ? 500 : 0);
  const hourlyLimit = row.hourlyLimit - (backgroundKey ? 50 : 0);

  if (used >= dailyLimit || counts.hourly >= hourlyLimit || counts.duplicate > 0) {
    throw new ProviderCapacityError("Provider allowance exhausted");
  }
  if (provider === "geoapify" && counts.recent >= 4) {
    throw new ProviderCapacityError("Provider request rate exhausted");
  }

  if (backgroundKey) {
    const [backgroundUsage] = await query(
      `SELECT COUNT(*)::int AS count FROM "SearchReservation"
      WHERE "provider" = $1 AND "background" = true AND "createdAt" >= $2`,
      [provider, dayStart],
    );
    const { count } = z.object({ count: z.number() }).parse(backgroundUsage);
    if (count >= 150) throw new ProviderCapacityError("Background daily allowance exhausted");
    const [attempt] = await query('SELECT "attemptedAt" FROM "ActivityEnrichmentAttempt" WHERE "requestKey" = $1', [backgroundKey]);
    if (attempt && z.object({ attemptedAt: z.date() }).parse(attempt).attemptedAt >= dayStart) {
      throw new ProviderCapacityError("Activity already attempted today");
    }
    await query(
      `INSERT INTO "ActivityEnrichmentAttempt" ("requestKey", "attemptedAt") VALUES ($1, $2)
      ON CONFLICT ("requestKey") DO UPDATE SET "attemptedAt" = EXCLUDED."attemptedAt"`,
      [backgroundKey, now],
    );
  }

  const expiresAt = reset ? new Date(dayStart.getTime() + 86_400_000) : row.expiresAt;
  await query('UPDATE "SearchAllowance" SET "used" = $2, "expiresAt" = $3 WHERE "provider" = $1', [provider, used + 1, expiresAt]);
  // Visitor requests omit the additive column, retaining compatibility before migration.
  if (backgroundKey) {
    await query(
      `INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil", "background")
      VALUES ($1, $2, $3, $4, $5, true)`,
      [randomUUID(), provider, key, now, new Date(now.getTime() + 60_000)],
    );
  } else {
    await query(
      `INSERT INTO "SearchReservation" ("id", "provider", "requestKey", "createdAt", "blockedUntil")
      VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), provider, key, now, new Date(now.getTime() + 60_000)],
    );
  }
}
