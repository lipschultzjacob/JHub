"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// The "Sync transactions" button. This is a stand-in for the automatic
// Plaid webhook we haven't built yet (that needs our server to have a
// public web address, which it doesn't have during local development).
// Clicking this button triggers the exact same work a webhook would
// eventually trigger automatically.
export function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  // Calls our sync endpoint and shows how many transactions changed.
  const handleSync = () => {
    startTransition(async () => {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = await res.json();
      setResult(`+${data.added} new, ${data.modified} updated, ${data.removed} removed`);
      router.refresh(); // reload the page's data so the new transactions show up
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Syncing..." : "Sync transactions"}
      </button>
      {result && <span className="text-sm text-zinc-400">{result}</span>}
    </div>
  );
}
