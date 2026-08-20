import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";

// Creates a "link token": a short-lived, one-time-use pass that the browser
// needs before it can open Plaid's "connect your bank" popup. This is
// different from (and much less sensitive than) the access_token we store
// later -- a link token can't be used to read any bank data by itself, so
// it's safe to hand to the browser.
//
// The frontend calls this endpoint (POST /api/plaid/link-token) right before
// opening that popup.
export async function POST() {
  // client_user_id is how Plaid tells different people apart across
  // multiple visits. Hardcoded to one value for now since the app doesn't
  // have logins/multiple users yet.
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: "single-user" },
    client_name: "JHub",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ linkToken: response.data.link_token });
}
