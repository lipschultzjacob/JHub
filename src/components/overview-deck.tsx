"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2 } from "lucide-react";
import { SortDeck, type DeckTransaction } from "@/components/sort-deck";
import { EmptyState } from "@/components/empty-state";

// The transaction id in a "#transaction-<id>" link (what a push notification
// opens), or null. Read from the browser's address bar.
function hashTransactionId(): number | null {
  const match = window.location.hash.match(/^#transaction-(\d+)$/);
  return match ? Number(match[1]) : null;
}

// The interactive part of Overview: the card deck of unsorted transactions
// (see SortDeck).
//
// Opened from a notification (/#transaction-<id>), the deck starts on that
// transaction's card. The address bar only exists in the browser, so it's
// read after the page loads (and again if the link changes while open), and
// the deck is rebuilt (`key`) to start on that card.
export function OverviewDeck({ transactions }: { transactions: DeckTransaction[] }) {
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
      initialTransactionId={linkedId ?? undefined}
      emptyState={
        <EmptyState icon={CheckCircle2} title="All Caught Up" message="Every transaction has a category." />
      }
    />
  );
}
