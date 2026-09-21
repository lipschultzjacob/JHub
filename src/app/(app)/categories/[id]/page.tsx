import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories } from "@/db/schema";
import { auth } from "@/auth";
import { TransactionRow } from "@/components/transaction-row";
import { card, bodyText65, metaText45 } from "@/components/recipes";

// Re-run the queries on every visit instead of freezing the page at build time.
export const dynamic = "force-dynamic";

// The detail page for one category ("/categories/3"): the transactions
// already sorted into it, each with a dropdown so you can move it elsewhere.
// (Once moved, it drops out of this list on the refresh that follows.)
//
// `params` holds the dynamic part of the URL (the "3"). In this Next.js
// version it arrives as a Promise, so it has to be awaited.
export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = Number(session!.user.id);

  const { id } = await params;
  const categoryId = Number(id);
  // A non-numeric URL like /categories/abc becomes NaN -- treat as not found.
  if (!Number.isInteger(categoryId)) notFound();

  // Never trust the URL alone: confirm this category belongs to the signed-in
  // user before querying anything else. Someone else's category shows the
  // same "not found" page as one that doesn't exist, so its existence isn't leaked.
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!category) notFound();

  // All of this user's categories, for each row's dropdown.
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));

  // This category's transactions, newest first. Same join chain as Overview
  // (transactions -> plaidAccounts -> plaidItems) with the ownership filter.
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
    .where(and(eq(plaidItems.userId, userId), eq(transactions.categoryId, categoryId)))
    .orderBy(desc(transactions.date));

  return (
    <>
      <Link href="/categories" className={`text-sm hover:text-accent ${metaText45}`}>
        ← Categories
      </Link>
      <h1 className="font-heading text-[40px]">{category.name}</h1>

      {rows.length === 0 && (
        <div className={card}>
          <p className={`text-sm ${bodyText65}`}>Nothing sorted into this category yet.</p>
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
