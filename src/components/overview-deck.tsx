"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2 } from "lucide-react";
import { SortDeck, type DeckCategory, type DeckTransaction } from "@/components/sort-deck";
import { EmptyState } from "@/components/empty-state";

// The transaction id in a "#transaction-<id>" link (what a push notification
// opens), or null. Read from the browser's address bar.
function hashTransactionId(): number | null {
  const match = window.location.hash.match(/^#transaction-(\d+)$/);
  return match ? Number(match[1]) : null;
}

// Saves a transaction's category (null = back to unsorted), via
// PATCH /api/transactions/<id>. Returns an error message, or null on success.
async function assign(transactionId: number, categoryId: number | null) {
  const res = await fetch(`/api/transactions/${transactionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId }),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return (data?.error as string | undefined) ?? "Couldn't save. Try again.";
}

// The interactive part of Overview: the card deck of unsorted transactions,
// sorted by holding a card and dragging it onto a category (see SortDeck).
// Saving goes straight to the server; the deck hides sorted cards itself,
// so there's no page reload between sorts.
//
// Opened from a notification (/#transaction-<id>), the deck starts on that
// transaction's card. The address bar only exists in the browser, so it's
// read after the page loads (and again if the link changes while open), and
// the deck is rebuilt (`key`) to start on that card.
export function OverviewDeck({
  transactions,
  categories,
}: {
  transactions: DeckTransaction[];
  categories: DeckCategory[];
}) {
  const linkedId = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    hashTransactionId,
    () => null // on the server there's no address bar to read
  );

  return (
    <SortDeck
      key={linkedId ?? "start"}
      transactions={transactions}
      categories={categories}
      assign={assign}
      initialTransactionId={linkedId ?? undefined}
      emptyState={
        <EmptyState icon={CheckCircle2} title="All Caught Up" message="Every transaction has a category." />
      }
    />
  );
}
