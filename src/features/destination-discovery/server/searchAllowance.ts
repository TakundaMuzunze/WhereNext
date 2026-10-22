import "server-only";
import { prisma } from "@/shared/lib/db/prisma";
import type { SearchAllowance } from "@/generated/prisma/client";

const oneHourMs = 60 * 60 * 1000;
const duplicateCooldownMs = 60 * 1000;

export type ReservationResult = { status: "reserved" } | { status: "duplicate"; retryAt: string } | { status: "unavailable" };

// Every future SerpApi engine must use this same guard and provider budget.
// No network work takes place inside the transaction.
export async function reserveSerpApiSearch(requestKey: string): Promise<ReservationResult> {
  return prisma.$transaction(
    async (transaction) => {
      // Let only one search at a time check and spend the shared allowance.
      // Other transactions wait for this one to finish before checking it.
      const [allowance] = await transaction.$queryRaw<SearchAllowance[]>`
        SELECT * FROM "SearchAllowance" WHERE "provider" = 'serpapi' FOR UPDATE
      `;
      // Use the database clock after acquiring the lock, not the app host clock.
      const [{ now }] = await transaction.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      if (!allowance) return { status: "unavailable" };

      const budgetExpired = allowance.expiresAt <= now;
      const budgetSpent = allowance.used >= allowance.limit;
      const hourlySearchDisabled = allowance.hourlyLimit <= 0;

      if (budgetExpired || budgetSpent || hourlySearchDisabled) return { status: "unavailable" };

      // Do not spend another credit on a search made within the last minute.
      const duplicate = await transaction.searchReservation.findFirst({
        where: { provider: "serpapi", requestKey, blockedUntil: { gt: now } },
        orderBy: { blockedUntil: "desc" },
      });

      if (duplicate) return { status: "duplicate", retryAt: duplicate.blockedUntil.toISOString() };

      // Count a rolling hour, rather than resetting the count on the hour.
      const oneHourAgo = new Date(now.getTime() - oneHourMs);
      const hourlyUsage = await transaction.searchReservation.count({
        where: { provider: "serpapi", createdAt: { gt: oneHourAgo } },
      });

      if (hourlyUsage >= allowance.hourlyLimit) return { status: "unavailable" };

      // Both writes succeed together or neither is saved. Keep this record
      // even if the later provider call fails: it may still cost a credit.
      await transaction.searchAllowance.update({ where: { provider: "serpapi" }, data: { used: { increment: 1 } } });

      const blockedUntil = new Date(now.getTime() + duplicateCooldownMs);

      await transaction.searchReservation.create({
        data: { provider: "serpapi", requestKey, createdAt: now, blockedUntil },
      });

      return { status: "reserved" };
    },
    { maxWait: 2000, timeout: 5000 },
  );
}
