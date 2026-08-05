import { Pool, type QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    // Supabase (and most managed Postgres) requires TLS; local Docker
    // Postgres has no TLS listener. rejectUnauthorized: false accepts
    // Supabase's cert chain without bundling their CA — the connection is
    // still encrypted, just not certificate-pinned.
    ssl: isLocalHost(connectionString) ? undefined : { rejectUnauthorized: false },
  });
}

// Reused across hot reloads / server action invocations in the same process.
const pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export type TxQuery = {
  query: typeof query;
  queryOne: typeof queryOne;
};

/** Runs `fn` inside a BEGIN/COMMIT, rolling back on any thrown error. */
export async function withTransaction<T>(fn: (tx: TxQuery) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const tx: TxQuery = {
    query: async (text, params = []) => (await client.query(text, params)).rows,
    queryOne: async (text, params = []) => {
      const result = await client.query(text, params);
      return result.rows[0] ?? null;
    },
  };
  try {
    await client.query("BEGIN");
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
