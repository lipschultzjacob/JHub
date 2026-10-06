"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2 } from "lucide-react";
import { SortDeck, type DeckTransaction } from "@/components/sort-deck";
import { EmptyState } from "@/components/empty-state";
import type { ReviewStatus } from "@/db/schema";

// The transaction id in a "#transaction-<id>" link (what a push notification
// opens), or null. Read from the browser's address bar.
function hashTransactionId(): number | null {
  const match = window.location.hash.match(/^#transaction-(\d+)$/);
  return match ? Number(match[1]) : null;
}

// Saves a transaction's review status ("reimburse" / "clear", or null =
// back to unreviewed), via PATCH /api/transactions/<id>. Returns an error
// message, or null on success.
async function review(transactionId: number, reviewStatus: ReviewStatus | null) {
  const res = await fetch(`/api/transactions/${transactionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewStatus }),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return (data?.error as string | undefined) ?? "Couldn't save. Try again.";
}

// The interactive part of Overview: the deck of transactions you haven't
// reviewed yet, swiped left to reimburse or right to clear (see SortDeck).
// Saving goes straight to the server; the deck hides reviewed cards itself,
// so there's no page reload between swipes.
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
      review={review}
      initialTransactionId={linkedId ?? undefined}
      emptyState={
        <EmptyState icon={CheckCircle2} title="All Caught Up" message="Every transaction has been reviewed." />
      }
    />
  );
}
