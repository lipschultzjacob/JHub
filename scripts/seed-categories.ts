// Adds the default set of budgeting categories to one specific user's
// account. New users get these automatically at signup (see
// src/app/api/auth/signup/route.ts) -- this script is only useful for
// re-adding the defaults to an account that already exists, e.g. after
// changing the DEFAULT_CATEGORIES list in src/lib/default-categories.ts.
// Safe to run more than once: onConflictDoNothing means a category that
// already exists for that user (by name) just gets skipped.
//
// Usage: npm run db:seed -- you@example.com
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users, categories } from "../src/db/schema";
import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";

// Looks up the user by email, inserts the default categories for them, and
// prints how many were actually new.
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run db:seed -- you@example.com");
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const inserted = await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })))
    .onConflictDoNothing()
    .returning({ name: categories.name });

  console.log(`Seeded ${inserted.length} new categories for ${email}.`);
  process.exit(0);
}

main();
