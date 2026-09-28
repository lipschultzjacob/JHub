"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { buttonGhost } from "@/components/recipes";
import { isPushSupported, turnOffPush } from "@/lib/push-client";

// A "Sign out" button, shown on the Settings screen. Before signing out it
// turns off push notifications on this device, so a signed-out browser never
// keeps showing notifications about your transactions. That has to happen
// first: removing the server's record needs you to still be signed in.
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  // Turns notifications off (if they're on), then signs out. A failure to
  // turn them off never blocks signing out -- if the server's record is left
  // behind, the browser side is already unsubscribed, and the Plaid webhook
  // deletes such dead records on its own.
  async function handleClick() {
    setPending(true);
    if (isPushSupported()) {
      await turnOffPush().catch(() => {});
    }
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button onClick={handleClick} disabled={pending} className={buttonGhost}>
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
