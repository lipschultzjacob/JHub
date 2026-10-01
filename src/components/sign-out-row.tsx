"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ListRow } from "@/components/grouped-list";
import { ConfirmAlert } from "@/components/confirm-alert";
import { isPushSupported, turnOffPush } from "@/lib/push-client";

// The red "Sign Out" row on Settings. Asks "are you sure?" first, so a stray
// tap doesn't log you out. Before signing out it turns off push
// notifications on this device, so a signed-out browser never keeps showing
// notifications about your transactions. That has to happen first: removing
// the server's record needs you to still be signed in.
export function SignOutRow() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  // Turns notifications off (if they're on), then signs out. A failure to
  // turn them off never blocks signing out -- if the server's record is left
  // behind, the browser side is already unsubscribed, and the Plaid webhook
  // deletes such dead records on its own.
  async function signOutNow() {
    setConfirming(false);
    setPending(true);
    if (isPushSupported()) {
      await turnOffPush().catch(() => {});
    }
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <ListRow
        title={pending ? "Signing Out..." : "Sign Out"}
        tone="destructive"
        onClick={() => setConfirming(true)}
        disabled={pending}
      />
      <ConfirmAlert
        open={confirming}
        title="Sign Out?"
        message="Notifications will also turn off on this device."
        confirmLabel="Sign Out"
        onConfirm={signOutNow}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
