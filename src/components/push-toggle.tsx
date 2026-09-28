"use client";

import { useEffect, useState } from "react";
import { buttonSecondary, bodyText65 } from "@/components/recipes";
import {
  isPushSupported,
  getCurrentSubscription,
  saveSubscription,
  turnOnPush,
  turnOffPush,
} from "@/lib/push-client";

// "loading" = still checking; "dev" = development build (no service worker,
// so notifications can't work -- see service-worker-registration.tsx).
type Status = "loading" | "dev" | "unsupported" | "denied" | "off" | "on";

// The body of the Notifications card on Settings: a line saying whether
// notifications are on for THIS device, plus a Turn on / Turn off button.
// Each device (browser or phone) subscribes separately, so this never
// affects your other devices.
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On first load, figures out which state to show. If this device already
  // has a subscription, it's also re-sent to the server -- a harmless repeat
  // normally, but it restores the server's record if that row was ever lost,
  // so "on" really means notifications will arrive.
  useEffect(() => {
    async function checkStatus() {
      if (process.env.NODE_ENV !== "production") return "dev";
      if (!isPushSupported()) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      const existing = await getCurrentSubscription();
      if (!existing) return "off";
      await saveSubscription(existing).catch(() => {});
      return "on";
    }
    checkStatus().then(setStatus);
  }, []);

  // Turns notifications on or off (whichever they aren't), keeping the
  // button disabled while it works and showing an error if it fails.
  async function toggle() {
    setPending(true);
    setError(null);
    try {
      if (status === "on") {
        await turnOffPush();
        setStatus("off");
      } else {
        const permission = await turnOnPush();
        if (permission === "granted") setStatus("on");
        else if (permission === "denied") setStatus("denied");
        // "default" means the permission prompt was dismissed -- stay off.
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") return null;

  const message = {
    dev: "Notifications only work in the production app -- the service worker they rely on is turned off during development.",
    unsupported:
      "This browser can't show notifications. On an iPhone, add JHub to your Home Screen first, then open it from there.",
    denied:
      "Notifications are blocked for this site. Allow them in your browser's site settings, then reload this page.",
    off: "Notifications are off on this device.",
    on: "Notifications are on for this device. You'll get one when a new transaction comes in.",
  }[status];

  return (
    <>
      <p className={`text-sm ${bodyText65}`}>{message}</p>
      {(status === "on" || status === "off") && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={buttonSecondary}
          >
            {pending
              ? status === "on"
                ? "Turning off..."
                : "Turning on..."
              : status === "on"
                ? "Turn off"
                : "Turn on"}
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      )}
    </>
  );
}
