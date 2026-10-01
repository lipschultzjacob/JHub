import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, plaidAccounts, plaidItems, categories } from "@/db/schema";
import { auth } from "@/auth";
import { NavBar } from "@/components/nav-bar";
import { ListSection } from "@/components/grouped-list";
import { EmptyState } from "@/components/empty-state";
import { TransactionListRow } from "@/components/transaction-list-row";
import { RenameCategoryButton } from "@/components/rename-category-button";

// Re-run the queries on every visit instead of freezing the page at build time.
export const dynamic = "force-dynamic";

// The screen for one category ("/categories/3"), opened from the Categories
// list. A pushed screen: "‹ Categories" back button, the category's name,
// and a "Rename" button at the top; then the transactions already sorted
// into it, each with a category dropdown so you can move it elsewhere.
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
      <NavBar
        title={category.name}
        backHref="/categories"
        backLabel="Categories"
        action={<RenameCategoryButton id={category.id} name={category.name} />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Transactions"
          message={`Nothing is sorted into ${category.name} yet.`}
        />
      ) : (
        <ListSection>
          {rows.map((row) => (
            <TransactionListRow key={row.id} row={row} categories={allCategories} />
          ))}
        </ListSection>
      )}
    </>
  );
}
