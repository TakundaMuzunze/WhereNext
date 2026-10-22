import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/shared/lib/db/prisma";
import type { SearchAllowance } from "@/generated/prisma/client";

type Provider = "travelpayouts" | "geonames" | "geoapify";
const budgets: Record<Provider, { daily: number; hourly: number }> = {
  travelpayouts: { daily: 5000, hourly: 300 },
  geonames: { daily: 8000, hourly: 800 },
  geoapify: { daily: 2500, hourly: 200 },
};

// Shared database ceilings cover all app instances. No credit is refunded on failure.
async function reserve(provider: Provider, key: string): Promise<void> {
  const budget = budgets[provider];
  await prisma.$transaction(async (tx) => {
    await tx.searchAllowance.upsert({
      where: { provider },
      create: { provider, limit: budget.daily, hourlyLimit: budget.hourly, expiresAt: new Date(0) },
      update: {},
    });
    const [row] = await tx.$queryRaw<SearchAllowance[]>`SELECT * FROM "SearchAllowance" WHERE "provider" = ${provider} FOR UPDATE`;
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    if (!row) throw new Error("Provider allowance unavailable");
    const reset = row.expiresAt <= now;
    const used = reset ? 0 : row.used;
    const hourly = await tx.searchReservation.count({ where: { provider, createdAt: { gt: new Date(now.getTime() - 3_600_000) } } });
    const duplicate = await tx.searchReservation.findFirst({ where: { provider, requestKey: key, blockedUntil: { gt: now } } });
    if (used >= row.limit || hourly >= row.hourlyLimit || duplicate) throw new Error("Provider allowance exhausted");
    const expiresAt = reset ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)) : row.expiresAt;
    await tx.searchAllowance.update({ where: { provider }, data: { used: used + 1, expiresAt } });
    await tx.searchReservation.create({ data: { provider, requestKey: key, createdAt: now, blockedUntil: new Date(now.getTime() + 60_000) } });
  });
}

const cache = new Map<string, { expires: number; value: Promise<unknown>; retrievedAt?: string }>();
function cacheKey(url: URL, headers?: HeadersInit) {
  return createHash("sha256")
    .update(url.toString())
    .update(JSON.stringify(headers ?? {}))
    .digest("hex");
}

export function providerRetrievedAt(url: URL, headers?: HeadersInit): string | null {
  return cache.get(cacheKey(url, headers))?.retrievedAt ?? null;
}

// Bounded process cache coalesces concurrent identical requests. Database ceilings
// remain authoritative when processes restart or multiple instances are running.
export async function providerJson(provider: Provider, url: URL, ttlSeconds: number, headers?: HeadersInit): Promise<unknown> {
  const key = cacheKey(url, headers);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = (async () => {
    await reserve(provider, key);
    const response = await fetch(url, { headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Provider request failed");
    const body: unknown = await response.json();
    const entry = cache.get(key);
    if (entry) entry.retrievedAt = new Date().toISOString();
    return body;
  })();
  if (cache.size >= 200) cache.delete(cache.keys().next().value ?? "");
  cache.set(key, { expires: Date.now() + ttlSeconds * 1000, value });
  try {
    return await value;
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    const cause =
      error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause ? String(error.cause.code) : "unknown";
    console.warn(`[discovery] ${provider} request failed (${error instanceof Error ? error.name : "unknown"}, ${code}, cause ${cause})`);
    // Cool down errors too, preventing a failing upstream from consuming a quota.
    cache.set(key, { expires: Date.now() + 60_000, value });
    throw new Error("Provider unavailable");
  }
}
