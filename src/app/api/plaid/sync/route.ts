import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems, plaidAccounts, transactions } from "@/db/schema";
import { auth } from "@/auth";

// Fetches whatever transactions have changed since the last sync, for every
// connected bank. This is a manual stand-in for the "webhook" we haven't
// built yet -- a webhook is Plaid automatically calling our server the
// moment something happens, but that requires our server to have a public
// web address, which it doesn't have yet. Clicking "Sync transactions" in
// the UI calls this endpoint (POST /api/plaid/sync) instead, and does the
// same work on demand.
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

  // Go through every connected bank one at a time.
  for (const item of items) {
    const accounts = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.plaidItemId, item.id));
    // Plaid identifies each account with its own ID string. Our database
    // uses a different, internal number as each account's ID instead (so it
    // can be linked to from the transactions table). This map converts
    // between the two: Plaid's ID in, our internal ID out.
    const accountIdByPlaidId = new Map(
      accounts.map((a) => [a.plaidAccountId, a.id])
    );

    let cursor = item.cursor ?? undefined;
    let hasMore = true;

    // Plaid's sync endpoint hands back results a page at a time rather than
    // all at once. Each response says whether there's more to fetch
    // (has_more) and includes a cursor (bookmark) for fetching the next
    // page. Keep asking until has_more comes back false, then save
    // whatever cursor we ended on for next time.
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: item.accessToken,
        cursor,
      });
      const data = response.data;

      // Build the rows we're about to save. "added" are brand-new
      // transactions; "modified" are existing ones Plaid says have changed
      // (e.g. a pending charge that's now posted) -- both get saved the
      // same way below.
      const upsertRows = [...data.added, ...data.modified]
        .map((t) => {
          const accountId = accountIdByPlaidId.get(t.account_id);
          if (!accountId) return null; // this account isn't in our database yet -- skip it rather than crash
          return {
            plaidTransactionId: t.transaction_id,
            plaidAccountId: accountId,
            amount: t.amount.toFixed(2),
            merchantName: t.merchant_name ?? null,
            name: t.name,
            date: t.date,
            pending: t.pending,
            plaidCategory: t.personal_finance_category?.primary ?? null,
          };
        })
        .filter((row) => row !== null);

      if (upsertRows.length > 0) {
        // "Upsert" means: insert this row if it's new, or update it if a
        // row with the same plaidTransactionId already exists. `excluded`
        // below is Postgres's name for "the row we were about to insert" --
        // this is the standard way to write an upsert in Postgres.
        // Deliberately NOT updating categoryId here: if you've already
        // picked a category for a transaction and Plaid later marks it
        // "modified" (e.g. pending -> posted), we don't want that update to
        // erase the category you chose.
        await db
          .insert(transactions)
          .values(upsertRows)
          .onConflictDoUpdate({
            target: transactions.plaidTransactionId,
            set: {
              amount: sql`excluded.amount`,
              merchantName: sql`excluded.merchant_name`,
              name: sql`excluded.name`,
              date: sql`excluded.date`,
              pending: sql`excluded.pending`,
              plaidCategory: sql`excluded.plaid_category`,
            },
          });
      }

      added += data.added.length;
      modified += data.modified.length;

      // Handle transactions Plaid says no longer exist (e.g. a pending
      // charge that got cancelled) by deleting them from our database too.
      if (data.removed.length > 0) {
        const removedIds = data.removed
          .map((t) => t.transaction_id)
          .filter((id): id is string => id !== null && id !== undefined);
        if (removedIds.length > 0) {
          await db
            .delete(transactions)
            .where(inArray(transactions.plaidTransactionId, removedIds));
        }
        removed += data.removed.length;
      }

      cursor = data.next_cursor;
      hasMore = data.has_more;
    }

    // Save the bookmark (cursor) so the next sync only asks for what's new since now.
    await db
      .update(plaidItems)
      .set({ cursor })
      .where(eq(plaidItems.id, item.id));
  }

  return NextResponse.json({ added, modified, removed });
}
