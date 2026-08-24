// Sets up the connection to the Postgres database that the rest of the app
// uses to read/write data. Every other file imports `db` from here rather
// than connecting to the database itself.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

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
  dbInstance: Db | undefined;
};

// Builds (or reuses) the actual database connection. Deliberately NOT run
// automatically when this file is first imported -- see the Proxy below for
// why that matters.
function getDb(): Db {
  if (globalForDb.dbInstance) return globalForDb.dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (check .env.local)");
  }

  const queryClient =
    globalForDb.queryClient ?? postgres(process.env.DATABASE_URL);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.queryClient = queryClient;
  }

  const instance = drizzle(queryClient, { schema });
  globalForDb.dbInstance = instance;
  return instance;
}

// The main export: everything else in the app uses this to run database
// queries, e.g. `db.select()...`. It looks like a plain object, but it's
// actually a "Proxy" -- a wrapper that intercepts property access (like
// `.select`) and only THEN calls getDb() above to actually connect.
//
// Why this matters: on Vercel, secrets like DATABASE_URL are only handed to
// the app while it's actually handling a real request, not while the app is
// being built beforehand. If connecting happened as soon as this file was
// imported (as it used to), the build itself would fail with "DATABASE_URL
// is not set" even though it's set correctly, because building isn't a real
// request yet. Delaying the actual connection until something on `db` is
// used for real (which only happens once a request comes in) avoids that.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    return getDb()[prop as keyof Db];
  },
});
