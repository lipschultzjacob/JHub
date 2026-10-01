import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { auth } from "@/auth";
import { CategoriesView } from "@/components/categories-view";

// Re-run the queries on every visit instead of freezing the page at build
// time, so counts stay current as transactions are sorted.
export const dynamic = "force-dynamic";

// The Categories list ("/categories"): a large title with a "+" to create a
// category (the only place categories get created -- new accounts start with
// none), then one row per category you own with how many transactions are
// sorted into it. Tapping a row opens /categories/[id]; swiping it left
// deletes it after an "are you sure?". The interactive parts live in
// CategoriesView; this page just loads the data.
//
// A "Server Component" (see ARCHITECTURE.md): it queries the database
// directly. The proxy (src/proxy.ts) already guarantees you're logged in.
export default async function CategoriesPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Each of this user's categories plus how many transactions it holds. Uses
  // a LEFT join so a category with zero transactions still appears (count 0)
  // rather than vanishing. Ownership is enforced by categories.userId: only
  // this user's categories are returned, and the transactions API only lets a
  // transaction be assigned to a category its own user owns, so every counted
  // transaction is this user's too.
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      total: count(transactions.id),
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id, categories.name)
    .orderBy(asc(categories.name));

  return <CategoriesView rows={rows} />;
}
