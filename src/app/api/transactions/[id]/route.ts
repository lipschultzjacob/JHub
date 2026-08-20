import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";

// Sets (or clears, if categoryId is null) which budgeting category one
// transaction belongs to. This is what the category dropdown on the
// transactions page calls when you pick a category, and later this is what
// the push notification's built-in category picker will call too.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { categoryId } = await request.json();

  const [updated] = await db
    .update(transactions)
    .set({ categoryId })
    .where(eq(transactions.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
