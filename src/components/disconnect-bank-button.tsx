"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonSecondary } from "@/components/recipes";

// The "Disconnect" button next to one connected bank. Asks for confirmation
// first (the browser's built-in confirm popup), because disconnecting also
// permanently deletes that bank's transactions from JHub.
export function DisconnectBankButton({
  itemId,
  institutionName,
}: {
  itemId: number;
  institutionName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Confirms, calls the disconnect endpoint, then refreshes the page's data
  // so the bank drops out of the list.
  const handleClick = () => {
    const ok = window.confirm(
      `Disconnect ${institutionName}? This also permanently deletes its transactions from JHub, including ones you've already categorized.`
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleClick} disabled={isPending} className={buttonSecondary}>
        {isPending ? "Disconnecting..." : "Disconnect"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
