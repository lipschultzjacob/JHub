import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { auth } from "@/auth";
import { TodayCard } from "@/components/today-card";

// Without this, Next.js would bake this page's data in once at build time,
// freezing the to-do list at whatever it looked like when the app was last
// built. This forces it to re-run the database query below on every visit.
export const dynamic = "force-dynamic";

// The home page ("/"). This is the first piece of the full Overview screen
// (issue #3) -- the "Today" to-do card (issue #10). The header greeting/
// summary line and the "Sort these"/"This month" cards are separate,
// still-unbuilt pieces (issues #11, #12), so this page is just the one card
// for now rather than the full two-column layout the design spec describes.
//
// The proxy (src/proxy.ts) already guarantees no one reaches this page
// without being logged in, so session.user is safe to assume exists here.
export default async function Home() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Oldest first, per the design spec -- newly-added todos append to the end.
  const rows = await db
    .select({
      id: todos.id,
      text: todos.text,
      done: todos.done,
      dueDate: todos.dueDate,
    })
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(asc(todos.createdAt));

  return (
    <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
      <TodayCard initialTodos={rows} />
    </div>
  );
}
