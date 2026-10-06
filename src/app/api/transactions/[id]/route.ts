import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories, REVIEW_STATUSES, type ReviewStatus } from "@/db/schema";
import { auth } from "@/auth";

// Updates one transaction. The request body can carry either field, or both:
// - `categoryId`: which budgeting category it belongs to (null = none). The
//   category dropdown on a category's screen sends this.
// - `reviewStatus`: "reimburse" or "clear" from swiping its card on
//   Overview, or null to put it back in the deck (Undo).
// A field that's left out of the body is left unchanged.
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
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const changes: { categoryId?: number | null; reviewStatus?: ReviewStatus | null } = {};

  // Only accept a review status we know about (or null). The database column
  // itself would take any text, so this check is what keeps it clean.
  if ("reviewStatus" in body) {
    const { reviewStatus } = body;
    if (reviewStatus !== null && !REVIEW_STATUSES.includes(reviewStatus)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    changes.reviewStatus = reviewStatus;
  }
  if ("categoryId" in body) changes.categoryId = body.categoryId;
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

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
  if (changes.categoryId != null) {
    const { categoryId } = changes;
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
    .set(changes)
    .where(eq(transactions.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
