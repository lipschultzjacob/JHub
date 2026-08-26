import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories } from "@/db/schema";
import { auth } from "@/auth";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { SyncButton } from "@/components/sync-button";
import { CategorySelect } from "@/components/category-select";
import { SignOutButton } from "@/components/sign-out-button";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

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
// The middleware (src/middleware.ts) already guarantees no one reaches this
// page without being logged in, so session.user is safe to assume exists here.
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
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>{session!.user.email}</span>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <PlaidLinkButton />
        {items.length > 0 && <SyncButton />}
        <PushSubscribeButton />
      </div>

      {items.length === 0 && (
        <p className="mt-4 text-sm text-zinc-400">
          No bank connected yet. Connect one to start pulling transactions
          (sandbox credentials only for now -- use Plaid&apos;s test
          institution with username <code>user_good</code> / password{" "}
          <code>pass_good</code>).
        </p>
      )}

      <div className="mt-8 divide-y divide-white/10">
        {rows.map((row) => (
          <div
            key={row.id}
            id={`transaction-${row.id}`}
            // target:target-current highlights whichever row matches the
            // page's #transaction-<id> URL fragment -- how the push
            // notification points you straight at the transaction it's about.
            className="flex scroll-mt-6 items-center justify-between gap-4 py-3 target:bg-white/5"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {row.merchantName ?? row.name}
                {row.pending && (
                  <span className="ml-2 text-xs text-zinc-500">(pending)</span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {row.date} - {row.accountName}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {/* Plaid convention: positive = money out, negative = money in */}
              <span className="tabular-nums">${row.amount}</span>
              <CategorySelect
                transactionId={row.id}
                categoryId={row.categoryId}
                categories={allCategories}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
