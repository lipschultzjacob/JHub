"use client";

import { useEffect, useState } from "react";

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

type Status = "unsupported" | "denied" | "off" | "on" | "working";

// A button that turns on push notifications for this browser. Handles the
// whole flow: asking permission, subscribing via the browser's Web Push
// API, and saving the subscription to our server.
export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("working");

  useEffect(() => {
    checkStatus();
  }, []);

  // Figures out the current state: not supported, permission denied,
  // supported-but-not-subscribed, or already subscribed.
  async function checkStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setStatus(existing ? "on" : "off");
  }

  // Runs when the button is clicked: asks for permission, subscribes, and
  // saves the subscription server-side.
  async function handleSubscribe() {
    setStatus("working");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "denied" : "off");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // required by the spec: every push must show a visible notification
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    setStatus("on");
  }

  if (status === "unsupported") return null; // e.g. Safari on an older iOS -- nothing sensible to show
  if (status === "on") {
    return <span className="text-sm text-zinc-400">Notifications on</span>;
  }
  if (status === "denied") {
    return (
      <span className="text-sm text-zinc-400">
        Notifications blocked -- enable them in your browser&apos;s site settings
      </span>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={status === "working"}
      className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      Enable notifications
    </button>
  );
}
