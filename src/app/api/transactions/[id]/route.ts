import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, REVIEW_STATUSES, type ReviewStatus } from "@/db/schema";
import { auth } from "@/auth";

// Updates one transaction. The request body can carry either field, or both:
// - `reviewStatus`: "reimburse" or "clear" from swiping its card on
//   Overview, or null to put it back in the deck (Undo).
// - `reimbursed`: true when its checkmark is pressed on the To Do screen
//   (records the current time as reimbursedAt), or false to put it back on
//   the list (Undo). Only a "reimburse" transaction can be marked reimbursed.
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
  const changes: { reviewStatus?: ReviewStatus | null; reimbursedAt?: Date | null } = {};

  // Only accept a review status we know about (or null). The database column
  // itself would take any text, so this check is what keeps it clean.
  if ("reviewStatus" in body) {
    const { reviewStatus } = body;
    if (reviewStatus !== null && !REVIEW_STATUSES.includes(reviewStatus)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    changes.reviewStatus = reviewStatus;
  }
  // The time comes from the server's clock, not the browser, so it can't be
  // faked or thrown off by a phone with the wrong time.
  if ("reimbursed" in body) {
    if (typeof body.reimbursed !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    changes.reimbursedAt = body.reimbursed ? new Date() : null;
  }
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // A transaction doesn't have its own userId column -- ownership is proven
  // by following the chain transaction -> account -> bank connection and
  // checking that chain ends at this user. Without this check, anyone
  // logged in could edit anyone else's transaction just by guessing an ID.
  const [owned] = await db
    .select({ id: transactions.id, reviewStatus: transactions.reviewStatus })
    .from(transactions)
    .innerJoin(plaidAccounts, eq(transactions.plaidAccountId, plaidAccounts.id))
    .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
    .where(and(eq(transactions.id, Number(id)), eq(plaidItems.userId, userId)));

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Marking something reimbursed only makes sense if it was marked
  // "reimburse" in the first place (counting a status change in this same
  // request).
  const statusAfter = "reviewStatus" in changes ? changes.reviewStatus : owned.reviewStatus;
  if (changes.reimbursedAt && statusAfter !== "reimburse") {
    return NextResponse.json({ error: "This transaction isn't marked for reimbursement" }, { status: 400 });
  }

  const [updated] = await db
    .update(transactions)
    .set(changes)
    .where(eq(transactions.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
