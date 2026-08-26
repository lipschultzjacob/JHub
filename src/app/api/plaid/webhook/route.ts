import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidItems, pushSubscriptions } from "@/db/schema";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook-verify";
import { syncPlaidItem, type NewTransaction } from "@/lib/plaid-sync";
import { sendPushNotification } from "@/lib/web-push";

// This is the endpoint Plaid itself calls automatically the moment there's
// new transaction activity on a connected bank -- the real "notify me
// instantly" mechanism this whole feature exists for, replacing the manual
// "Sync transactions" button. Plaid finds this URL because it's passed as
// the `webhook` option when creating a link token (see
// src/app/api/plaid/link-token/route.ts).
export async function POST(request: Request) {
  // Reading the body as text (not request.json()) because verifying the
  // signature needs the *exact* original bytes Plaid sent -- re-serializing
  // parsed JSON isn't guaranteed to produce identical bytes.
  const rawBody = await request.text();
  const verified = await verifyPlaidWebhook(
    rawBody,
    request.headers.get("Plaid-Verification")
  );
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Plaid sends many kinds of webhooks (new transactions, item errors,
  // etc.) to this same URL -- this app currently only acts on the one that
  // means "new transaction data is ready to fetch." Anything else is
  // acknowledged (200) but otherwise ignored.
  if (body.webhook_type !== "TRANSACTIONS" || body.webhook_code !== "SYNC_UPDATES_AVAILABLE") {
    return NextResponse.json({ ignored: true });
  }

  const [item] = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.plaidItemId, body.item_id));
  if (!item) {
    // A webhook for a bank connection we don't have on record -- nothing to do.
    return NextResponse.json({ ignored: true });
  }

  const { newTransactions } = await syncPlaidItem(item);
  if (newTransactions.length > 0) {
    await notifyUser(item.userId, newTransactions);
  }

  return NextResponse.json({ success: true });
}

// Sends a push notification (or notifications) to every device/browser the
// given user has subscribed on, about the transactions that just came in.
async function notifyUser(userId: number, newTransactions: NewTransaction[]) {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (subscriptions.length === 0) return; // no devices to notify

  // More than a few at once (e.g. catching up after being offline) gets
  // combined into one summary notification instead of flooding the device.
  const notifications =
    newTransactions.length <= 3
      ? newTransactions.map((t) => ({
          title: t.merchantName ?? t.name,
          body: `$${t.amount}`,
          url: `/transactions#transaction-${t.id}`,
        }))
      : [
          {
            title: `${newTransactions.length} new transactions`,
            body: "Tap to review and categorize",
            url: "/transactions",
          },
        ];

  for (const subscription of subscriptions) {
    for (const notification of notifications) {
      try {
        await sendPushNotification(subscription, notification);
      } catch (err) {
        // A push service returns 404/410 when a subscription is no longer
        // valid (browser data cleared, notifications revoked, etc.) --
        // clean those up so we stop trying to send to them. Any other kind
        // of failure is logged but not treated as fatal for the rest of the
        // loop -- one bad subscription shouldn't stop the others.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        } else {
          console.error("Failed to send push notification:", err);
        }
      }
    }
  }
}
