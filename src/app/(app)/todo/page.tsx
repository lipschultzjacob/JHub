import { and, desc, eq, isNull } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { LargeTitle } from "@/components/large-title";
import { EmptyState } from "@/components/empty-state";
import { TodoList } from "@/components/todo-list";

// Re-run the query on every visit instead of freezing the page at build
// time, so newly swiped transactions show up.
export const dynamic = "force-dynamic";

// The To Do screen ("/todo"): every transaction you swiped left ("Reimburse")
// on Overview that you haven't checked off yet, newest first, each with a
// checkmark button to mark it reimbursed (see TodoList).
//
// A "Server Component" (see ARCHITECTURE.md): it queries the database
// directly and hands the rows to TodoList, which runs in the browser. The
// proxy (src/proxy.ts) already guarantees you're logged in.
export default async function TodoPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // This user's "reimburse" transactions that don't have a reimbursed date
  // yet. As on Overview, the two inner joins also enforce ownership:
  // transactions don't store a user id, so we filter through
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
    .where(
      and(
        eq(plaidItems.userId, userId),
        eq(transactions.reviewStatus, "reimburse"),
        isNull(transactions.reimbursedAt)
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.id));

  return (
    <>
      <LargeTitle>To Do</LargeTitle>
      <TodoList
        items={rows.map((r) => ({
          id: r.id,
          merchant: r.merchantName ?? r.name,
          amount: r.amount,
          date: r.date,
          accountName: r.accountName,
          pending: r.pending,
        }))}
        emptyState={
          <EmptyState
            icon={CheckCircle2}
            title="Nothing to Reimburse"
            message="Transactions you swipe left on Overview show up here."
          />
        }
      />
    </>
  );
}
