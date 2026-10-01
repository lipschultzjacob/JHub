"use client";

import { useEffect, useState } from "react";
import { ListSection, ListRow } from "@/components/grouped-list";
import { Switch } from "@/components/switch";
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

// The Notifications section on Settings: one "Notifications" row with an
// iOS switch that turns notifications on or off for THIS device, and a
// short explanation underneath. Each device (browser or phone) subscribes
// separately, so this never affects your other devices. When notifications
// can't be used here (blocked, unsupported browser, dev server), the switch
// is grayed out and the explanation says why.
export function NotificationsSection() {
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
  // switch disabled while it works and showing an error if it fails.
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

  // The explanation under the section. While still checking ("loading"),
  // the section shows with the switch off and grayed, so nothing jumps.
  const explanation = {
    loading: undefined,
    dev: "Notifications only work in the installed app, not on the development server.",
    unsupported:
      "This browser can't show notifications. On an iPhone, add JHub to your Home Screen and open it from there.",
    denied: "Notifications are blocked for JHub. Allow them in iPhone Settings, then reopen JHub.",
    off: "Get a notification on this device when a new transaction comes in.",
    on: "Get a notification on this device when a new transaction comes in.",
  }[status];
  const usable = status === "on" || status === "off";

  return (
    <ListSection footer={error ?? explanation}>
      <ListRow
        title="Notifications"
        accessory={
          <Switch
            label="Notifications"
            checked={status === "on"}
            onChange={toggle}
            disabled={!usable || pending}
          />
        }
      />
    </ListSection>
  );
}
