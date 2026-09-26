import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { auth } from "@/auth";
import { validateCategoryName, isCategoryNameTaken, isUniqueViolation } from "@/lib/category-name";

// Shared first steps for both handlers below: confirms someone is signed in,
// and that the category id in the URL belongs to them. Returns either the
// ids to work with, or the error response to send back as-is.
async function findOwnedCategory(
  params: Promise<{ id: string }>
): Promise<{ userId: number; categoryId: number } | { response: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const categoryId = Number(id);
  // A non-numeric id (e.g. /categories/abc) can't match any row.
  if (!Number.isInteger(categoryId)) {
    return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  // Confirm the category is this user's own -- the id in the URL alone is
  // never trusted. Someone else's category gets the same 404 as a missing one.
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!category) {
    return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { userId, categoryId };
}

// Renames one category (PATCH /api/categories/<id>, body: { name }). This is
// what the "Rename" control on the Categories list calls.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owned = await findOwnedCategory(params);
  if ("response" in owned) return owned.response;
  const { userId, categoryId } = owned;

  const body = await request.json().catch(() => null);
  const { name, error } = validateCategoryName(body);
  if (error !== undefined) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const duplicateError = NextResponse.json(
    { error: "You already have a category with that name." },
    { status: 409 }
  );
  // Checked against this user's OTHER categories only, so renaming to its
  // own current name, or just changing its capitalization, is fine.
  if (await isCategoryNameTaken(userId, name, categoryId)) return duplicateError;

  try {
    const [updated] = await db
      .update(categories)
      .set({ name })
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) return duplicateError;
    throw err;
  }
}

// Deletes one category (DELETE /api/categories/<id>). This is what the
// "Delete" control on the Categories list calls, after you confirm.
// Transactions that were sorted into it aren't deleted: the database's
// "on delete set null" rule on transactions.category_id (src/db/schema.ts)
// clears their category automatically, so they reappear as unsorted on
// Overview.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owned = await findOwnedCategory(params);
  if ("response" in owned) return owned.response;
  const { userId, categoryId } = owned;

  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  return NextResponse.json({ success: true });
}
