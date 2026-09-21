import { CategorySelect } from "@/components/category-select";
import { metaText45 } from "@/components/recipes";

type Category = { id: number; name: string };

export type TransactionRowData = {
  id: number;
  amount: string;
  merchantName: string | null;
  name: string;
  date: string;
  pending: boolean;
  categoryId: number | null;
  accountName: string;
};

// One transaction in a list: merchant, date + account, amount, and a category
// dropdown. Shared by the Overview and category-detail pages so they look and
// behave the same. It has no "use client" line, so it renders on the server
// (a "Server Component"); only the CategorySelect inside it runs in the browser.
export function TransactionRow({
  row,
  categories,
}: {
  row: TransactionRowData;
  categories: Category[];
}) {
  return (
    <div
      id={`transaction-${row.id}`}
      // target:target-current highlights whichever row matches the page's
      // #transaction-<id> URL fragment -- how a push notification points you
      // straight at the transaction it's about.
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
          categories={categories}
        />
      </div>
    </div>
  );
}
