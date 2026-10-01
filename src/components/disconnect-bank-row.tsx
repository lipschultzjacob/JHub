"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListSection, ListRow } from "@/components/grouped-list";
import { ConfirmAlert } from "@/components/confirm-alert";

// The red "Disconnect Bank" row at the bottom of a bank's screen
// (/settings/banks/[id]), in its own section. Asks "are you sure?" first,
// because disconnecting also permanently deletes that bank's transactions
// from JHub. On success it goes back to Settings, where the bank is gone;
// on failure it shows the server's message under the row.
export function DisconnectBankRow({
  itemId,
  institutionName,
}: {
  itemId: number;
  institutionName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runs after "Disconnect" in the alert: calls the disconnect endpoint
  // (which revokes the connection at Plaid, then deletes it here), then
  // returns to Settings.
  const disconnect = () => {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      router.push("/settings");
      router.refresh();
    });
  };

  return (
    <>
      <ListSection footer={error ?? undefined}>
        <ListRow
          title={isPending ? "Disconnecting..." : "Disconnect Bank"}
          tone="destructive"
          onClick={() => setConfirming(true)}
          disabled={isPending}
        />
      </ListSection>
      <ConfirmAlert
        open={confirming}
        title={`Disconnect ${institutionName}?`}
        message="Its transactions, including ones you've already sorted, will be deleted from JHub."
        confirmLabel="Disconnect"
        onConfirm={disconnect}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
