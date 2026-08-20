import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems, plaidAccounts } from "@/db/schema";

// Finishes connecting a bank account. The frontend calls this
// (POST /api/plaid/exchange-token) right after Plaid's popup succeeds,
// handing over the public_token it received. That public_token is
// short-lived and only useful for this one exchange -- here we trade it for
// the real access_token, which is the actual long-lived credential used for
// every future request about this bank connection. From this point on,
// access_token stays on the server and is never sent back to the browser.
export async function POST(request: Request) {
  const { publicToken, institutionId, institutionName } = await request.json();

  // Trade the temporary public_token for the real, long-lived access_token.
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  const { access_token: accessToken, item_id: plaidItemId } =
    exchangeResponse.data;

  // Save this bank connection to the database.
  const [item] = await db
    .insert(plaidItems)
    .values({
      plaidItemId,
      accessToken,
      institutionId,
      institutionName,
    })
    .returning();

  // Fetch the individual accounts (checking, savings, ...) under this bank
  // connection now, so the transaction sync step later has something to
  // attach each transaction to.
  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  // Save each of those accounts to the database.
  await db.insert(plaidAccounts).values(
    accountsResponse.data.accounts.map((account) => ({
      plaidItemId: item.id,
      plaidAccountId: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
    }))
  );

  return NextResponse.json({ success: true });
}
