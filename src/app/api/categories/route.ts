import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { auth } from "@/auth";
import { validateCategoryName, isCategoryNameTaken, isUniqueViolation } from "@/lib/category-name";

// Creates a new category for the signed-in user (POST /api/categories, body:
// { name }). This is what the "+ New category" card on the Categories list
// calls. It's the only way categories come into existence -- new accounts
// start with none.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body = await request.json().catch(() => null);
  const { name, error } = validateCategoryName(body);
  if (error !== undefined) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const duplicateError = NextResponse.json(
    { error: "You already have a category with that name." },
    { status: 409 }
  );
  if (await isCategoryNameTaken(userId, name)) return duplicateError;

  try {
    // userId always comes from the session, never from the request body, so
    // nobody can create a category inside someone else's account.
    const [created] = await db.insert(categories).values({ userId, name }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) return duplicateError;
    throw err;
  }
}
