import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems, plaidAccounts } from "@/db/schema";

// Called by the frontend right after Plaid Link succeeds. public_token is
// short-lived and only good for this exchange -- it's swapped here for the
// long-lived access_token, which is the actual credential used for every
// future API call against this bank connection. access_token never gets
// sent back to the browser from this point on.
export async function POST(request: Request) {
  const { publicToken, institutionId, institutionName } = await request.json();

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  const { access_token: accessToken, item_id: plaidItemId } =
    exchangeResponse.data;

  const [item] = await db
    .insert(plaidItems)
    .values({
      plaidItemId,
      accessToken,
      institutionId,
      institutionName,
    })
    .returning();

  // Pull the list of accounts (checking, savings, ...) attached to this item
  // now, so the transaction sync step later has something to attach to.
  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

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
