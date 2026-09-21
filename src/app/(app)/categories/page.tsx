import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { auth } from "@/auth";
import { CategoryCard } from "@/components/category-card";
import { card, bodyText65 } from "@/components/recipes";

// Re-run the queries on every visit instead of freezing the page at build
// time, so counts stay current as transactions are sorted.
export const dynamic = "force-dynamic";

// The Categories list ("/categories"): one card per category you own, showing
// how many transactions are sorted into it. Clicking a card opens
// /categories/[id], which lists those transactions.
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

  return (
    <>
      <h1 className="font-heading text-[40px]">Categories</h1>

      {rows.length === 0 && (
        <div className={card}>
          <p className={`text-sm ${bodyText65}`}>No categories yet.</p>
        </div>
      )}

      {/* Cards wrap into as many columns as fit (docs/design/components.md) */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {rows.map((row) => (
          <CategoryCard key={row.id} id={row.id} name={row.name} total={row.total} />
        ))}
      </div>
    </>
  );
}
