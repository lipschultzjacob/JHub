import Link from "next/link";
import { desc, eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories } from "@/db/schema";
import { auth } from "@/auth";
import { TransactionRow } from "@/components/transaction-row";
import { card, bodyText65 } from "@/components/recipes";

// Without this, Next.js would try to bake this page's data in once at build
// time, freezing the list. This forces the database queries below to re-run
// on every visit, so newly synced transactions and category changes show up.
export const dynamic = "force-dynamic";

// The Overview screen ("/"): shows ONLY transactions that haven't been given a
// category yet (an "unsorted queue"), so you can sort them right here. Once
// you pick a category, CategorySelect saves it and refreshes the page, and
// that row drops out of the list because it's no longer unsorted.
//
// This is a "Server Component" (see ARCHITECTURE.md): it queries the database
// directly on the server. Only CategorySelect runs in the browser.
//
// The proxy (src/proxy.ts) already guarantees the visitor is logged in, so
// session.user is safe to assume exists here.
export default async function OverviewPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Which banks this user has connected (only used to pick the right empty
  // state below), and their own categories to choose from.
  const items = await db.select().from(plaidItems).where(eq(plaidItems.userId, userId));
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));

  // This user's unsorted transactions (categoryId IS NULL), newest first, with
  // each row's account name attached. The two inner joins also enforce
  // ownership: transactions don't store a user id, so we filter through
  // transactions -> plaidAccounts -> plaidItems.userId.
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
    .where(and(eq(plaidItems.userId, userId), isNull(transactions.categoryId)))
    .orderBy(desc(transactions.date));

  return (
    <>
      <h1 className="font-heading text-[40px]">Overview</h1>

      {rows.length > 0 && (
        <p className={`text-sm ${bodyText65}`}>
          {rows.length} to sort
        </p>
      )}

      {/* With nothing to pick from, every dropdown below would only offer
          "Uncategorized" -- point to where categories get created. */}
      {rows.length > 0 && allCategories.length === 0 && (
        <div className={card}>
          <p className={`text-sm ${bodyText65}`}>
            You don&apos;t have any categories yet. Create some on{" "}
            <Link href="/categories" className="underline hover:text-accent">
              Categories
            </Link>{" "}
            to start sorting.
          </p>
        </div>
      )}

      {/* Empty states: one for "no bank yet", one for "nothing left to sort". */}
      {items.length === 0 && (
        <div className={card}>
          <p className={`text-sm ${bodyText65}`}>
            No bank connected yet. Head to{" "}
            <Link href="/settings" className="underline hover:text-accent">
              Settings
            </Link>{" "}
            to connect one and start pulling in transactions.
          </p>
        </div>
      )}
      {items.length > 0 && rows.length === 0 && (
        <div className={card}>
          <p className={`text-sm ${bodyText65}`}>
            You&apos;re all caught up -- every transaction has a category.
          </p>
        </div>
      )}

      <div className="flex flex-col">
        {rows.map((row) => (
          <TransactionRow key={row.id} row={row} categories={allCategories} />
        ))}
      </div>
    </>
  );
}
