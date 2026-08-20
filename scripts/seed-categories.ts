// Adds a starter set of budgeting categories to the database. Safe to run
// more than once -- onConflictDoNothing means any category that already
// exists (by name) just gets skipped instead of causing an error. Edit the
// list below and re-run `npm run db:seed` any time to add more.
import { db } from "../src/db";
import { categories } from "../src/db/schema";

const DEFAULT_CATEGORIES = [
  { name: "Groceries", color: "#22c55e" },
  { name: "Dining", color: "#f97316" },
  { name: "Transportation", color: "#3b82f6" },
  { name: "Utilities", color: "#eab308" },
  { name: "Rent/Mortgage", color: "#a855f7" },
  { name: "Entertainment", color: "#ec4899" },
  { name: "Shopping", color: "#06b6d4" },
  { name: "Health", color: "#ef4444" },
  { name: "Income", color: "#16a34a" },
  { name: "Transfer", color: "#64748b" },
  { name: "Other", color: "#94a3b8" },
];

// Inserts the categories above and prints how many were actually new.
async function main() {
  const inserted = await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES)
    .onConflictDoNothing()
    .returning({ name: categories.name });

  console.log(`Seeded ${inserted.length} new categories.`);
  process.exit(0);
}

main();
