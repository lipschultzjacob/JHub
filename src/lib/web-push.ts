// Sends push notifications using the VAPID credentials (see .env.example).
// "VAPID" is the standard that lets a browser's push service (Google's,
// Mozilla's, etc.) confirm a notification really came from this app and not
// an impersonator, using a public/private key pair -- same idea as how
// HTTPS certificates prove a website is who it claims to be.
import webpush from "web-push";

let configured = false;

// Configures the web-push library the first time it's actually needed,
// rather than the moment this file is imported -- see src/db/index.ts and
// src/lib/plaid.ts for the full explanation of why that matters on Vercel.
function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "VAPID keys are not set (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)"
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Sends one push notification to one saved subscription (one device/browser).
// The payload is whatever JSON src/../public/sw.js's "push" event handler
// expects -- currently { title, body, url }.
export async function sendPushNotification(
  subscription: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string }
) {
  ensureConfigured();

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload)
  );
}
