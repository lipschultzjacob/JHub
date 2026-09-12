import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { auth } from "@/auth";

// Sets a to-do's `done` state -- this is what the Today card's row-tap
// (mark complete/incomplete) will call. Since `todos` has `user_id` directly
// on it (unlike `transactions`, which has to join down to `plaid_items` to
// find its owner), ownership here is a single equality check.
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
  const { done } = await request.json();
  if (typeof done !== "boolean") {
    return NextResponse.json({ error: "done must be a boolean" }, { status: 400 });
  }

  const [owned] = await db
    .select({ id: todos.id })
    .from(todos)
    .where(and(eq(todos.id, Number(id)), eq(todos.userId, userId)));

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(todos)
    .set({ done })
    .where(eq(todos.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
