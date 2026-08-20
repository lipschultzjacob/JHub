"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { useRouter } from "next/navigation";

// The button that starts connecting a bank account. Plaid Link is Plaid's
// own ready-made popup for picking your bank and logging in -- Plaid
// handles that whole flow and never hands your bank password to us. When it
// finishes successfully, Plaid gives the browser a short-lived public_token,
// which this component hands off to our server to be exchanged for the real
// long-lived connection.
export function PlaidLinkButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // As soon as this button appears on the page, ask our server for a link
  // token -- the popup can't open without one.
  useEffect(() => {
    fetch("/api/plaid/link-token", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setLinkToken(data.linkToken));
  }, []);

  // Runs when Plaid's popup finishes successfully. Sends what Plaid gave us
  // to our own server to actually finish connecting the account.
  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      if (!publicToken) return;
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id ?? null,
          institutionName: metadata.institution?.name ?? null,
        }),
      });
      router.refresh(); // reload the page's data so the newly connected account shows up
    },
    [router]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready || !linkToken}
      className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
    >
      Connect a bank account
    </button>
  );
}
