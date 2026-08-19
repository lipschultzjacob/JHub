import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit runs as a standalone CLI (not through Next.js), so it doesn't
// get .env.local loaded automatically the way Next.js server code does —
// this loads it explicitly just for the CLI commands (generate/migrate/studio).
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check .env.local)");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
