import { eq, inArray, sql } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems, plaidAccounts, transactions } from "@/db/schema";

type PlaidItemRow = typeof plaidItems.$inferSelect;

export type NewTransaction = {
  id: number;
  merchantName: string | null;
  name: string;
  amount: string;
};

// Fetches whatever's changed for ONE connected bank since its last sync, and
// saves it to the database. Both the manual "Sync transactions" button
// (src/app/api/plaid/sync/route.ts) and the Plaid webhook
// (src/app/api/plaid/webhook/route.ts) call this same function, so the
// actual syncing logic only exists in one place.
//
// Returns how many transactions were added/modified/removed, plus the full
// details of the newly-added ones specifically -- that last part is what
// lets the webhook know what to put in a push notification.
export async function syncPlaidItem(item: PlaidItemRow) {
  const accounts = await db
    .select()
    .from(plaidAccounts)
    .where(eq(plaidAccounts.plaidItemId, item.id));
  // Plaid identifies each account with its own ID string. Our database uses
  // a different, internal number as each account's ID instead (so it can be
  // linked to from the transactions table). This map converts between the
  // two: Plaid's ID in, our internal ID out.
  const accountIdByPlaidId = new Map(accounts.map((a) => [a.plaidAccountId, a.id]));

  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;
  const newTransactions: NewTransaction[] = [];

  // Plaid's sync endpoint hands back results a page at a time rather than
  // all at once. Each response says whether there's more to fetch
  // (has_more) and includes a cursor (bookmark) for fetching the next page.
  // Keep asking until has_more comes back false, then save whatever cursor
  // we ended on for next time.
  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
    });
    const data = response.data;

    // Track which transaction IDs are genuinely brand-new (as opposed to
    // "modified," e.g. a pending charge that's now posted) -- that's the
    // set we'll actually want to send a notification about.
    const addedIds = new Set(data.added.map((t) => t.transaction_id));

    // Build the rows we're about to save. "added" and "modified" both get
    // saved the same way below (an upsert), but we still need to tell them
    // apart afterward for notification purposes.
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
      // "Upsert" means: insert this row if it's new, or update it if a row
      // with the same plaidTransactionId already exists. `excluded` below
      // is Postgres's name for "the row we were about to insert" -- this is
      // the standard way to write an upsert in Postgres. Deliberately NOT
      // updating categoryId here: if you've already picked a category for a
      // transaction and Plaid later marks it "modified" (e.g. it goes from
      // pending to posted), we don't want that update to erase the category
      // you chose.
      const saved = await db
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
        })
        .returning({
          id: transactions.id,
          plaidTransactionId: transactions.plaidTransactionId,
          merchantName: transactions.merchantName,
          name: transactions.name,
          amount: transactions.amount,
        });

      for (const row of saved) {
        if (addedIds.has(row.plaidTransactionId)) {
          newTransactions.push({
            id: row.id,
            merchantName: row.merchantName,
            name: row.name,
            amount: row.amount,
          });
        }
      }
    }

    added += data.added.length;
    modified += data.modified.length;

    // Handle transactions Plaid says no longer exist (e.g. a pending charge
    // that got cancelled) by deleting them from our database too.
    if (data.removed.length > 0) {
      const removedIds = data.removed
        .map((t) => t.transaction_id)
        .filter((id): id is string => id !== null && id !== undefined);
      if (removedIds.length > 0) {
        await db.delete(transactions).where(inArray(transactions.plaidTransactionId, removedIds));
      }
      removed += data.removed.length;
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  // Save the bookmark (cursor) so the next sync only asks for what's new since now.
  await db.update(plaidItems).set({ cursor }).where(eq(plaidItems.id, item.id));

  return { added, modified, removed, newTransactions };
}
