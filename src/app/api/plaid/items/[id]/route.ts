import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { decrypt } from "@/lib/crypto";
import { plaidClient } from "@/lib/plaid";

// Disconnects one bank (DELETE /api/plaid/items/<id>). Two things have to
// happen: tell Plaid to revoke the connection (itemRemove), AND delete our
// own saved copy. Skipping the Plaid step would leave the credential live at
// Plaid even though we'd forgotten about it. Deleting our row automatically
// deletes that bank's accounts and their transactions too ("cascade" -- see
// src/db/schema.ts), including any you'd already categorized.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const itemId = Number(id);
  // A non-numeric id (e.g. /items/abc) can't match any row.
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only find the item if it's this user's own -- the id in the URL alone
  // is never trusted. Someone else's item gets the same 404 as a missing one.
  const [item] = await db
    .select()
    .from(plaidItems)
    .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, userId)));
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Revoke the connection at Plaid first. If this fails we stop and keep our
  // local row, so a live credential is never silently left behind and you can
  // retry. The one exception: ITEM_NOT_FOUND means Plaid already dropped it,
  // which is the outcome we want anyway, so that counts as success.
  try {
    await plaidClient.itemRemove({ access_token: decrypt(item.accessToken) });
  } catch (err) {
    const code = (err as { response?: { data?: { error_code?: string } } }).response?.data
      ?.error_code;
    if (code !== "ITEM_NOT_FOUND") {
      console.error("Plaid itemRemove failed", code ?? err);
      return NextResponse.json(
        { error: "Couldn't disconnect from Plaid. Nothing was changed -- try again." },
        { status: 502 }
      );
    }
  }

  await db.delete(plaidItems).where(eq(plaidItems.id, item.id));
  return NextResponse.json({ success: true });
}
