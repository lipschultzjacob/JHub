import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories } from "@/db/schema";
import { auth } from "@/auth";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { SyncButton } from "@/components/sync-button";
import { CategorySelect } from "@/components/category-select";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { card, bodyText65, metaText45 } from "@/components/recipes";

// Without this, Next.js would try to be clever and bake this page's data in
// once at build time (since nothing here obviously changes per visit),
// which would freeze the transaction list at whatever it looked like the
// moment the app was last built. This forces it to re-run the database
// queries below on every single visit instead, so new transactions and
// category changes actually show up.
export const dynamic = "force-dynamic";

// The main transactions page: connect a bank, sync transactions, and
// categorize them. This runs on the server (a "Server Component" -- see
// ARCHITECTURE.md), so it can query the database directly below with no
// separate API call needed, and none of this page's own code is sent to the
// browser. Only the interactive pieces further down (the connect button,
// sync button, category dropdowns) are separate "Client Components" that do
// run in the browser, since only they need to react to clicks.
//
// The proxy (src/proxy.ts) already guarantees no one reaches this page
// without being logged in, so session.user is safe to assume exists here.
//
// This still shows one flat transaction list -- the spec's "needs a
// category" split section and filter row are a separate pass (issue #4),
// since they're new layout/behavior rather than a restyle of what's here.
export default async function TransactionsPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Which banks this user has connected, and their own categories to choose from.
  const items = await db.select().from(plaidItems).where(eq(plaidItems.userId, userId));
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));

  // This user's transactions, newest first, with each row's account name
  // attached (a "join" -- pulling in a related piece of data from another
  // table). The two inner joins here aren't just for the account name --
  // they're also what makes it possible to filter down to only transactions
  // that trace back to this specific user's bank connections.
  const rows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      merchantName: transactions.merchantName,
      name: transactions.name,
      date: transactions.date,
      pending: transactions.pending,
      categoryId: transactions.categoryId,
      accountName: plaidAccounts.name,
    })
    .from(transactions)
    .innerJoin(plaidAccounts, eq(transactions.plaidAccountId, plaidAccounts.id))
    .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
    .where(eq(plaidItems.userId, userId))
    .orderBy(desc(transactions.date));

  return (
    <>
      <h1 className="font-heading text-[40px]">Transactions</h1>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <PlaidLinkButton />
          {items.length > 0 && <SyncButton />}
          <PushSubscribeButton />
        </div>

        {items.length === 0 && (
          <p className={`text-sm ${bodyText65}`}>
            No bank connected yet. Connect one to start pulling transactions
            (sandbox credentials only for now -- use Plaid&apos;s test
            institution with username <code>user_good</code> / password{" "}
            <code>pass_good</code>).
          </p>
        )}
        {items.length > 0 && rows.length === 0 && (
          <p className={`text-sm ${bodyText65}`}>No transactions yet -- try syncing.</p>
        )}
      </div>

      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.id}
            id={`transaction-${row.id}`}
            // target:target-current highlights whichever row matches the
            // page's #transaction-<id> URL fragment -- how the push
            // notification points you straight at the transaction it's about.
            className="flex flex-wrap scroll-mt-6 items-center justify-between gap-x-4 gap-y-2 border-b border-[color-mix(in_srgb,var(--color-text)_8%,transparent)] px-2 py-[var(--row-pad)] target:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
          >
            <div className="min-w-[160px] flex-1">
              <div className="truncate text-[15px]">
                {row.merchantName ?? row.name}
                {row.pending && (
                  <span className={`ml-2 text-[11px] ${metaText45}`}>(pending)</span>
                )}
              </div>
              <div className={`text-[11px] ${metaText45}`}>
                {row.date} · {row.accountName}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {/* Plaid convention: positive = money out, negative = money in */}
              <span className="min-w-[92px] text-right text-[15px] tabular-nums">${row.amount}</span>
              <CategorySelect
                transactionId={row.id}
                categoryId={row.categoryId}
                categories={allCategories}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
