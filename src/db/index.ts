// Sets up the connection to the Postgres database that the rest of the app
// uses to read/write data. Every other file imports `db` from here rather
// than connecting to the database itself.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check .env.local)");
}

// A "connection pool" is a small set of open connections to the database
// that get reused instead of opening a brand new connection for every single
// request -- opening connections is slow, so reusing them is much faster.
// This needs one extra trick during local development: Next.js reloads this
// file every time you save a change, which would normally open a fresh pool
// each time and leave the old ones open forever. Stashing the pool on
// `globalThis` (a place that survives those reloads) means it only gets
// created once, no matter how many times this file reloads.
const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

const queryClient =
  globalForDb.queryClient ?? postgres(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

// The main export: everything else in the app uses this to run database queries.
export const db = drizzle(queryClient, { schema });
