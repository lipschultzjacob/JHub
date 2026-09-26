import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

// The naming rules shared by creating a category (POST /api/categories) and
// renaming one (PATCH /api/categories/[id]), so the two can't drift apart.
// Server-only: it talks to the database, so browser components shouldn't
// import it (they just mirror the length limit on their text box).

export const MAX_CATEGORY_NAME_LENGTH = 40;

// Checks a request body's `name` field. Returns the cleaned-up name (with
// surrounding spaces trimmed off), or an error message to send back if it's
// missing, empty, or too long.
export function validateCategoryName(
  body: unknown
): { name: string; error?: undefined } | { name?: undefined; error: string } {
  const raw = (body as { name?: unknown } | null)?.name;
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length === 0) {
    return { error: "Name can't be empty." };
  }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { error: `Name can be at most ${MAX_CATEGORY_NAME_LENGTH} characters.` };
  }
  return { name };
}

// True if this user already has a category with this name, ignoring
// capitalization. The database's own uniqueness rule is case-sensitive
// ("groceries" and "Groceries" would both be allowed), which is why this
// separate check exists. `exceptId` leaves one category out of the check --
// used by rename, so renaming a category to its own current name (or just
// changing its capitalization) isn't treated as a clash with itself.
export async function isCategoryNameTaken(
  userId: number,
  name: string,
  exceptId?: number
): Promise<boolean> {
  const [clash] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        exceptId === undefined ? undefined : ne(categories.id, exceptId),
        sql`lower(${categories.name}) = lower(${name})`
      )
    );
  return Boolean(clash);
}

// True if a database error is Postgres's "unique violation" (error code
// 23505) -- here, meaning another request grabbed the same category name
// between our isCategoryNameTaken check and the actual write. Drizzle
// sometimes wraps the original error, so the code can be one level down
// under `cause`.
export function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
  return code === "23505";
}
