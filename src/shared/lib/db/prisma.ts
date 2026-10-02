// Server-side database client. Also loaded by the Better Auth CLI.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

// Reuse the client when Next.js reloads modules during development.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
