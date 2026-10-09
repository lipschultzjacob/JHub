import { and, eq, inArray, sql } from "drizzle-orm";
import type { Transaction as PlaidTransaction } from "plaid";
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

// What the end result should be for one Plaid transaction, once every page of
// a sync has been read: either "save this version of it" (isNew = it showed up
// in Plaid's `added` list, as opposed to only `modified`), or "delete it".
type FinalChange =
  | { kind: "save"; transaction: PlaidTransaction; isNew: boolean }
  | { kind: "remove" };

// How many rows to send to the database in one go. Postgres caps how many
// values a single query can carry (about 65,000), and a bank's first sync can
// return thousands of transactions -- so big lists get split into batches.
const BATCH_SIZE = 500;

// Splits a list into smaller lists of at most `size` items each.
function inBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Fetches whatever's changed for ONE connected bank since its last sync, and
// saves it to the database. Both the manual "Sync transactions" button
// (src/app/api/plaid/sync/route.ts) and the Plaid webhook
// (src/app/api/plaid/webhook/route.ts) call this same function, so the
// actual syncing logic only exists in one place.
//
// Returns how many transactions were added/modified/removed, plus the full
// details of the genuinely new ones specifically -- that last part is what
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
  const ourAccountIds = accounts.map((a) => a.id);

  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;

  // Step 1: read EVERY page before saving anything.
  //
  // Plaid's sync endpoint hands back results a page at a time rather than
  // all at once. Each response says whether there's more to fetch
  // (has_more) and includes a cursor (bookmark) for fetching the next page.
  //
  // We collect all pages first because related changes can land on
  // different pages. The main example: when a pending charge posts, Plaid
  // usually doesn't "modify" it -- it REMOVES the pending transaction and
  // ADDS the posted one as a brand-new transaction (with a different ID).
  // Plaid's docs say those two halves "aren't guaranteed to be in the same
  // page, but should happen within the same overall update". Seeing the
  // whole update at once is what lets step 2 carry your decision over.
  //
  // `finalChanges` keeps only the LAST thing that happened to each
  // transaction across pages (later pages win), so a transaction added on
  // one page and removed on a later one correctly ends up removed.
  const finalChanges = new Map<string, FinalChange>();
  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
    });
    const data = response.data;

    for (const t of data.added) {
      finalChanges.set(t.transaction_id, { kind: "save", transaction: t, isNew: true });
    }
    for (const t of data.modified) {
      // Something added earlier in this same update and then modified is
      // still new as far as notifications are concerned.
      const earlier = finalChanges.get(t.transaction_id);
      const isNew = earlier?.kind === "save" && earlier.isNew;
      finalChanges.set(t.transaction_id, { kind: "save", transaction: t, isNew });
    }
    for (const t of data.removed) {
      if (t.transaction_id) finalChanges.set(t.transaction_id, { kind: "remove" });
    }

    added += data.added.length;
    modified += data.modified.length;
    removed += data.removed.length;

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  const toSave = [...finalChanges.values()].filter((c) => c.kind === "save");
  const removedIds = [...finalChanges]
    .filter(([, change]) => change.kind === "remove")
    .map(([id]) => id);

  // Step 2: find your decisions on pending charges that have now posted.
  //
  // A posted transaction's `pending_transaction_id` points back at the
  // pending one it replaces. If we still have that pending row, read what you
  // decided on it (reimburse/clear, and whether it was checked off as
  // reimbursed) so the posted row can inherit it below. This has to happen
  // before step 4 deletes the pending row. Only rows on THIS bank
  // connection's accounts are looked at, so a decision can never leak
  // between banks or users.
  const pendingIds = toSave
    .map((c) => c.transaction.pending_transaction_id)
    .filter((id): id is string => !!id);
  const pendingRows = [];
  if (ourAccountIds.length > 0) {
    for (const batch of inBatches(pendingIds, BATCH_SIZE)) {
      pendingRows.push(
        ...(await db
          .select({
            plaidTransactionId: transactions.plaidTransactionId,
            reviewStatus: transactions.reviewStatus,
            reimbursedAt: transactions.reimbursedAt,
          })
          .from(transactions)
          .where(
            and(
              inArray(transactions.plaidTransactionId, batch),
              inArray(transactions.plaidAccountId, ourAccountIds)
            )
          ))
      );
    }
  }
  const pendingRowById = new Map(pendingRows.map((r) => [r.plaidTransactionId, r]));

  // Which of the transactions being saved are genuinely new, i.e. worth a
  // push notification. A posted charge that replaces a pending one we
  // already had is NOT new -- you were already notified about the pending
  // version, whether or not you've reviewed it yet.
  const notifyIds = new Set(
    toSave
      .filter((c) => {
        const pendingId = c.transaction.pending_transaction_id;
        return c.isNew && !(pendingId && pendingRowById.has(pendingId));
      })
      .map((c) => c.transaction.transaction_id)
  );

  // Step 3: save new and changed transactions.
  const upsertRows = toSave
    .map(({ transaction: t }) => {
      const accountId = accountIdByPlaidId.get(t.account_id);
      if (!accountId) return null; // this account isn't in our database yet -- skip it rather than crash
      const pendingRow = t.pending_transaction_id
        ? pendingRowById.get(t.pending_transaction_id)
        : undefined;
      return {
        plaidTransactionId: t.transaction_id,
        plaidAccountId: accountId,
        amount: t.amount.toFixed(2),
        merchantName: t.merchant_name ?? null,
        name: t.name,
        date: t.date,
        pending: t.pending,
        plaidCategory: t.personal_finance_category?.primary ?? null,
        // Carried over from the pending version, if there was one (step 2).
        reviewStatus: pendingRow?.reviewStatus ?? null,
        reimbursedAt: pendingRow?.reimbursedAt ?? null,
      };
    })
    .filter((row) => row !== null);

  const newTransactions: NewTransaction[] = [];
  for (const batch of inBatches(upsertRows, BATCH_SIZE)) {
    // "Upsert" means: insert this row if it's new, or update it if a row
    // with the same plaidTransactionId already exists. `excluded` below
    // is Postgres's name for "the row we were about to insert" -- this is
    // the standard way to write an upsert in Postgres. Deliberately NOT
    // updating categoryId here.
    //
    // reviewStatus/reimbursedAt are only filled in on an existing row if it
    // hasn't been reviewed yet -- so a "modified" update from Plaid (which
    // never carries a decision) can't erase what you decided. The case this
    // does cover: a sync that saved a posted row but failed before finishing
    // gets retried, and the retry carries the pending row's decision over.
    // (In an ON CONFLICT update, "transactions"."review_status" means the
    // value already in the database, before this update.)
    const saved = await db
      .insert(transactions)
      .values(batch)
      .onConflictDoUpdate({
        target: transactions.plaidTransactionId,
        set: {
          amount: sql`excluded.amount`,
          merchantName: sql`excluded.merchant_name`,
          name: sql`excluded.name`,
          date: sql`excluded.date`,
          pending: sql`excluded.pending`,
          plaidCategory: sql`excluded.plaid_category`,
          reviewStatus: sql`coalesce("transactions"."review_status", excluded.review_status)`,
          reimbursedAt: sql`case when "transactions"."review_status" is null then excluded.reimbursed_at else "transactions"."reimbursed_at" end`,
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
      if (notifyIds.has(row.plaidTransactionId)) {
        newTransactions.push({
          id: row.id,
          merchantName: row.merchantName,
          name: row.name,
          amount: row.amount,
        });
      }
    }
  }

  // Step 4: delete transactions Plaid says no longer exist -- a pending
  // charge that got cancelled, or one that has posted (its decision was
  // already copied onto the posted version in step 3). Like step 2, limited
  // to this bank connection's own accounts.
  if (ourAccountIds.length > 0) {
    for (const batch of inBatches(removedIds, BATCH_SIZE)) {
      await db
        .delete(transactions)
        .where(
          and(
            inArray(transactions.plaidTransactionId, batch),
            inArray(transactions.plaidAccountId, ourAccountIds)
          )
        );
    }
  }

  // Save the bookmark (cursor) so the next sync only asks for what's new
  // since now. This happens last, so if anything above fails, the next sync
  // re-reads the same update from the old bookmark instead of skipping it.
  await db.update(plaidItems).set({ cursor }).where(eq(plaidItems.id, item.id));

  return { added, modified, removed, newTransactions };
}
