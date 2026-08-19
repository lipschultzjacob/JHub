import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems, plaidAccounts, transactions } from "@/db/schema";

// Manually-triggered stand-in for the webhook we're deferring (webhooks need
// a public URL; this "sync now" button works fine against localhost). Loops
// every connected bank item and pulls whatever's changed since last sync.
export async function POST() {
  const items = await db.select().from(plaidItems);

  let added = 0;
  let modified = 0;
  let removed = 0;

  for (const item of items) {
    const accounts = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.plaidItemId, item.id));
    // Plaid transactions reference accounts by Plaid's own string account_id;
    // this maps that back to our internal integer plaid_accounts.id for the FK.
    const accountIdByPlaidId = new Map(
      accounts.map((a) => [a.plaidAccountId, a.id])
    );

    let cursor = item.cursor ?? undefined;
    let hasMore = true;

    // /transactions/sync is paginated -- each response says whether there's
    // more to fetch and gives a cursor for the next page. Keep calling until
    // has_more is false, then the final next_cursor is what we persist.
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: item.accessToken,
        cursor,
      });
      const data = response.data;

      const upsertRows = [...data.added, ...data.modified]
        .map((t) => {
          const accountId = accountIdByPlaidId.get(t.account_id);
          if (!accountId) return null; // account not in our DB yet; skip rather than crash
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
        await db
          .insert(transactions)
          .values(upsertRows)
          .onConflictDoUpdate({
            target: transactions.plaidTransactionId,
            // "excluded" refers to the row that would've been inserted --
            // this is Postgres's standard upsert pattern. Deliberately NOT
            // touching category_id here: if you've already categorized a
            // transaction and Plaid later marks it "modified" (e.g. it goes
            // from pending to posted), we don't want that to wipe out your
            // manual categorization.
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

    await db
      .update(plaidItems)
      .set({ cursor })
      .where(eq(plaidItems.id, item.id));
  }

  return NextResponse.json({ added, modified, removed });
}
