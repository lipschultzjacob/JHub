import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { syncPlaidItem } from "@/lib/plaid-sync";

// Fetches whatever transactions have changed since the last sync, for every
// connected bank. This is a manual stand-in for the Plaid webhook (see
// src/app/api/plaid/webhook/route.ts) -- useful for testing, or as a
// fallback if a webhook notification is ever missed. Clicking "Sync
// transactions" in the UI calls this endpoint (POST /api/plaid/sync).
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only this user's own connected banks -- never touch anyone else's.
  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, Number(session.user.id)));

  let added = 0;
  let modified = 0;
  let removed = 0;

  for (const item of items) {
    const result = await syncPlaidItem(item);
    added += result.added;
    modified += result.modified;
    removed += result.removed;
  }

  return NextResponse.json({ added, modified, removed });
}
