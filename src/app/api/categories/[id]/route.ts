import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { auth } from "@/auth";

const MAX_NAME_LENGTH = 40;

// Renames one category (PATCH /api/categories/<id>, body: { name }). This is
// what the "Rename" control on the Categories list calls.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const categoryId = Number(id);
  // A non-numeric id (e.g. /categories/abc) can't match any row.
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Confirm the category is this user's own -- the id in the URL alone is
  // never trusted. Someone else's category gets the same 404 as a missing one.
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate the new name: must be text, non-empty once surrounding spaces
  // are trimmed off, and not absurdly long.
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length === 0) {
    return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name can be at most ${MAX_NAME_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const duplicateError = NextResponse.json(
    { error: "You already have a category with that name." },
    { status: 409 }
  );

  // The database's own uniqueness rule is case-sensitive ("groceries" and
  // "Groceries" would both be allowed), so check case-insensitively here
  // too, against this user's OTHER categories (renaming to its own current
  // name, or just changing its capitalization, is fine).
  const [clash] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        ne(categories.id, categoryId),
        sql`lower(${categories.name}) = lower(${name})`
      )
    );
  if (clash) return duplicateError;

  try {
    const [updated] = await db
      .update(categories)
      .set({ name })
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    // Postgres "unique violation" error (code 23505): another
    // request took this exact name between the check above and this update.
    const code =
      (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return duplicateError;
    throw err;
  }
}
