import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/shared/lib/db/prisma";
import { reserveProvider, type Provider } from "./reserveProvider";

async function reserve(provider: Provider, key: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await reserveProvider((sql, values) => tx.$queryRawUnsafe<unknown[]>(sql, ...values), provider, key);
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

// Invalid external envelopes may be retained briefly, but must not poison a week-long evidence cache.
export function coolDownProviderResponse(url: URL) {
  const entry = cache.get(cacheKey(url));
  if (entry) entry.expires = Math.min(entry.expires, Date.now() + 60_000);
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
