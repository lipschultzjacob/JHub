import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories } from "@/db/schema";
import { auth } from "@/auth";

// Sets (or clears, if categoryId is null) which budgeting category one
// transaction belongs to. This is what the category dropdown on the
// transactions page calls when you pick a category, and later this is what
// the push notification's built-in category picker will call too.
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
  const { categoryId } = await request.json();

  // A transaction doesn't have its own userId column -- ownership is proven
  // by following the chain transaction -> account -> bank connection and
  // checking that chain ends at this user. Without this check, anyone
  // logged in could edit anyone else's transaction just by guessing an ID.
  const [owned] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(plaidAccounts, eq(transactions.plaidAccountId, plaidAccounts.id))
    .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
    .where(and(eq(transactions.id, Number(id)), eq(plaidItems.userId, userId)));

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Same idea for the category being assigned: make sure it's actually one
  // of this user's own categories, not someone else's.
  if (categoryId !== null) {
    const [ownedCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    if (!ownedCategory) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(transactions)
    .set({ categoryId })
    .where(eq(transactions.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
