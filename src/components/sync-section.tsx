"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListSection, ListRow } from "@/components/grouped-list";

// The small "Sync Now" section on Settings: one blue row that asks Plaid
// for any new transactions right away. In production new transactions
// usually arrive on their own (Plaid's webhook), so this is the "something
// seems missing" button -- and the only way to sync on the dev server,
// which Plaid's webhook can't reach. The result shows as small text under
// the section.
export function SyncSection() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  // Runs the sync, shows how many transactions changed, then reloads the
  // page's data.
  const handleSync = () => {
    startTransition(async () => {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      if (!res.ok) {
        setResult("Couldn't sync. Try again.");
        return;
      }
      const data = await res.json();
      setResult(`Synced: ${data.added} new, ${data.modified} updated, ${data.removed} removed.`);
      router.refresh(); // reload the page's data so the new transactions show up
    });
  };

  return (
    <ListSection
      footer={result ?? "New transactions usually arrive on their own. Use this if something seems missing."}
    >
      <ListRow title={isPending ? "Syncing..." : "Sync Now"} tone="tint" onClick={handleSync} disabled={isPending} />
    </ListSection>
  );
}
