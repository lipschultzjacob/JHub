import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Landmark } from "lucide-react";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { LargeTitle } from "@/components/large-title";
import { EmptyState } from "@/components/empty-state";
import { OverviewDeck } from "@/components/overview-deck";

// Without this, Next.js would try to bake this page's data in once at build
// time, freezing the list. This forces the database queries below to re-run
// on every visit, so newly synced transactions and category changes show up.
export const dynamic = "force-dynamic";

// The Overview screen ("/"): your transactions that don't have a category
// yet, as a deck of cards to swipe through (OverviewDeck / SortDeck). Or,
// when there's nothing to show, an empty state saying why: no bank connected
// yet, or all caught up.
//
// This is a "Server Component" (see ARCHITECTURE.md): it queries the database
// directly on the server and hands the results to the deck, which runs in the
// browser. The proxy (src/proxy.ts) already guarantees the visitor is logged
// in, so session.user is safe to assume exists here.
export default async function OverviewPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Which banks this user has connected (only used to pick the right empty
  // state below).
  const items = await db.select({ id: plaidItems.id }).from(plaidItems).where(eq(plaidItems.userId, userId));

  // This user's unsorted transactions (categoryId IS NULL), newest first, with
  // each one's account name attached. The two inner joins also enforce
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
      accountName: plaidAccounts.name,
    })
    .from(transactions)
    .innerJoin(plaidAccounts, eq(transactions.plaidAccountId, plaidAccounts.id))
    .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
    .where(and(eq(plaidItems.userId, userId), isNull(transactions.categoryId)))
    .orderBy(desc(transactions.date), desc(transactions.id));

  const linkButton = "min-h-11 inline-flex items-center text-body text-accent no-underline active:opacity-60";

  let body: React.ReactNode;
  if (items.length === 0) {
    body = (
      <EmptyState
        icon={Landmark}
        title="No Bank Connected"
        message="Connect a bank to start pulling in your transactions."
        action={<Link href="/settings" className={linkButton}>Go to Settings</Link>}
      />
    );
  } else {
    // The deck shows its own "All Caught Up" once there's nothing left.
    body = (
      <OverviewDeck
        transactions={rows.map((r) => ({
          id: r.id,
          merchant: r.merchantName ?? r.name,
          amount: r.amount,
          date: r.date,
          accountName: r.accountName,
          pending: r.pending,
        }))}
      />
    );
  }

  return (
    <>
      <LargeTitle>Overview</LargeTitle>
      {body}
    </>
  );
}
