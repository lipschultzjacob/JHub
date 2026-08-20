// Settings for drizzle-kit, the command-line tool behind `npm run db:generate`,
// `npm run db:migrate`, and `npm run db:studio`.
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit runs as its own separate command-line program, not through
// Next.js -- so unlike the rest of the app's server code, it doesn't
// automatically read the .env.local file. This line loads it manually so
// DATABASE_URL below actually has a value when these commands run.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check .env.local)");
}

export default defineConfig({
  schema: "./src/db/schema.ts", // where the table definitions live
  out: "./drizzle", // where generated migration files get written
  dialect: "postgresql", // which kind of database this is
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
