import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.SUPABASE_DB_URL ??
  process.env.SUPABASE_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DB_URL, SUPABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
  throw new Error(
    "Database connection string must be a Postgres URI (postgres:// or postgresql://). Got something else — check that SUPABASE_URL holds the DB connection string, not the project REST URL.",
  );
}

const useSsl = /supabase\.com|render\.com/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
