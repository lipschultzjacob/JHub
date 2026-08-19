"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Manual stand-in for the Plaid webhook (deferred until we have a public URL
// to receive it at). Calls the same /transactions/sync logic the webhook
// would eventually trigger automatically.
export function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const handleSync = () => {
    startTransition(async () => {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = await res.json();
      setResult(`+${data.added} new, ${data.modified} updated, ${data.removed} removed`);
      router.refresh();
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
