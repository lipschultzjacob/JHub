import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { auth } from "@/auth";

// Creates a new to-do for the logged-in user. Only the text is accepted here
// -- due_date always comes out null, since no part of the app has a way to
// set one yet (see the comment on the `dueDate` column in schema.ts).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { text } = await request.json();
  if (typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(todos)
    .values({ userId, text: text.trim() })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
