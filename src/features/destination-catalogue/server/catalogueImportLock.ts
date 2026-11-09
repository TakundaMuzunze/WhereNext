import type { Pool, PoolClient } from "pg";

export const catalogueImportLock = [78293, 38];

// Only these deliberately authored messages are safe to display in command logs.
export class CatalogueImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueImportError";
  }
}

export function catalogueDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!databaseUrl || !directUrl) {
    throw new CatalogueImportError("Catalogue imports require DATABASE_URL and DIRECT_URL for the same database.");
  }

  let application: URL;
  let direct: URL;

  try {
    application = new URL(databaseUrl);
    direct = new URL(directUrl);
  } catch {
    throw new CatalogueImportError("Invalid catalogue database configuration. Check DATABASE_URL and DIRECT_URL.");
  }

  const applicationHost = application.hostname.replace("-pooler.", ".");
  const sameDatabase = applicationHost === direct.hostname && application.port === direct.port && application.pathname === direct.pathname;

  if (!sameDatabase || !["postgres:", "postgresql:"].includes(direct.protocol)) {
    throw new CatalogueImportError(
      "Use a direct PostgreSQL connection to the same database as DATABASE_URL. Pooled session locks are not supported.",
    );
  }

  return directUrl;
}

export async function withCatalogueImportLock<T>(pool: Pool, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let connectionError: Error | undefined;
  let locked = false;
  const onConnectionError = (error: Error) => {
    connectionError = error;
  };
  client.on("error", onConnectionError);

  try {
    const result = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1, $2) AS locked", catalogueImportLock);
    locked = result.rows[0].locked;

    if (!locked) {
      throw new CatalogueImportError("Another catalogue import is running. No source requests or writes were made.");
    }

    return await operation(client);
  } finally {
    try {
      if (locked && !connectionError) {
        await client.query("SELECT pg_advisory_unlock($1, $2)", catalogueImportLock);
      }
    } finally {
      client.removeListener("error", onConnectionError);
      client.release(connectionError);
    }
  }
}
