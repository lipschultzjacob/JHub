import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";

// Called by the frontend before opening Plaid Link. A link_token is a
// short-lived, single-use token that configures what Link's UI can do
// (which products, which countries) -- it is NOT the same as the access_token
// we eventually store; it's safe to hand to the browser.
export async function POST() {
  // client_user_id is how Plaid tells your users apart across Link sessions.
  // Hardcoded for now since there's no auth/multi-user support yet.
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: "single-user" },
    client_name: "JHub",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ linkToken: response.data.link_token });
}
