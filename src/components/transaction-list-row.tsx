import { CategorySelect } from "@/components/category-select";
import { rowSeparatorClass } from "@/components/grouped-list";
import { formatMoney, formatShortDate } from "@/lib/format-money";

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

// One transaction as an iOS-style list row, for use inside a ListSection:
// merchant on top with "Sep 12 · Checking" underneath, and on the right the
// amount (money in shown green with a "+") over its category, which is a
// dropdown -- tapping it on an iPhone opens Apple's picker wheel to move the
// transaction to another category. Used on a category's screen. (Overview
// sorts with a card deck instead -- see sort-deck.tsx.)
// No "use client", so it renders on the server; only the dropdown runs in
// the browser.
export function TransactionListRow({
  row,
  categories,
}: {
  row: TransactionRowData;
  categories: Category[];
}) {
  const amount = formatMoney(row.amount);

  return (
    <div
      id={`transaction-${row.id}`}
      className={`relative flex min-h-11 items-center gap-2.5 bg-surface px-gutter py-2.5 ${rowSeparatorClass}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body">{row.merchantName ?? row.name}</span>
        <span className="truncate text-subheadline text-text-secondary">
          {row.pending && "Pending · "}
          {formatShortDate(row.date)} · {row.accountName}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className={`text-body tabular-nums ${amount.isIncome ? "text-green" : ""}`}>{amount.text}</span>
        {/* 17px text: anything under 16px makes iPhone Safari zoom in when
            the dropdown is tapped. The chevron after the name is drawn by
            the select rule in globals.css. */}
        <CategorySelect
          transactionId={row.id}
          categoryId={row.categoryId}
          categories={categories}
          className="-mr-0.5 max-w-40 truncate border-0 bg-transparent py-0 pl-0 text-right text-body text-accent"
        />
      </div>
    </div>
  );
}
