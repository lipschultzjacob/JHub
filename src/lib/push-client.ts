// Browser-side helpers for turning this device's push notifications on and
// off. Shared by the Notifications switch on Settings (notifications-section.tsx)
// and the Sign Out row (signing out also turns notifications off on the device).
// Browser-only: these use the browser's Web Push APIs, so only Client
// Components ("use client") should import this file.

// Web Push's browser API wants the VAPID public key as raw bytes, but env
// vars can only hold text -- it's stored as "base64url" (a URL-safe variant
// of base64 text). This converts that text back into the raw bytes the
// browser API actually expects.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Safe);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// True if this browser has the pieces push notifications need at all (a
// service worker, the Push API, and notifications). Older iPhones, or an
// iPhone using the site in Safari instead of from the Home Screen, don't.
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Returns this device's current push subscription, or null if it doesn't
// have one. Uses getRegistration (which answers "no service worker" right
// away) rather than serviceWorker.ready (which would wait forever when no
// service worker is registered, e.g. during development).
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

// Tells our server about a subscription (POST /api/push/subscribe), so the
// Plaid webhook knows to send notifications to it. Safe to repeat: the route
// updates the existing row instead of making a duplicate.
export async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) throw new Error("Couldn't save the subscription");
}

// Turns notifications on for this device: asks permission (the browser's
// own "Allow notifications?" prompt), subscribes through the browser's Web
// Push API, and saves the subscription to our server. Returns the
// permission result, so the caller can tell "you said no" apart from
// success.
export async function turnOnPush(): Promise<NotificationPermission> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // required by the spec: every push must show a visible notification
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await saveSubscription(subscription);
  return permission;
}

// Turns notifications off for this device only (other devices are
// untouched). Unsubscribes in the browser first, which kills this device's
// subscription for good, and then removes our server's record of it. If
// that second step fails, nothing breaks: the next notification sent to the
// dead subscription gets rejected, and the Plaid webhook deletes the leftover
// row itself (see notifyUser in src/app/api/plaid/webhook/route.ts).
export async function turnOffPush(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}
