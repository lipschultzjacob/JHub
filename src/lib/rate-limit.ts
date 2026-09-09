// Simple database-backed rate limiter -- blocks a "key" (an email address, an
// IP address, whatever the caller chooses) after too many attempts within a
// time window. There's no Redis or other in-memory store in this stack, and
// Vercel's serverless functions don't share in-memory state between requests
// anyway, so the existing Postgres database is used as the shared counter
// instead of adding a new piece of infrastructure just for this.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Records one attempt for this key and reports whether it should be
// blocked. Call this once per attempt (e.g. once per login POST), before
// doing the actual work -- if it returns true, refuse the request instead of
// checking the password at all.
export async function isRateLimited(key: string): Promise<boolean> {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.key, key));

  if (!existing || now.getTime() - existing.windowStart.getTime() > WINDOW_MS) {
    // No record yet, or the old window has expired -- start a fresh count of 1.
    await db
      .insert(loginAttempts)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: { count: 1, windowStart: now },
      });
    return false;
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return true;
  }

  await db
    .update(loginAttempts)
    .set({ count: existing.count + 1 })
    .where(eq(loginAttempts.key, key));
  return false;
}

// Clears a key's attempt count -- call this after a successful login so a
// legitimate user who mistyped their password a couple of times isn't left
// halfway toward a lockout for the rest of the window.
export async function resetAttempts(key: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}
