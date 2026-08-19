"use client";

import { useEffect } from "react";

// Registers /sw.js so the browser starts controlling this app in the background
// (required for both installability and push notifications).
//
// Registration is gated to production only: in dev, Turbopack rebuilds/serves
// files constantly, and a caching service worker fighting against that leads to
// confusing "why isn't my change showing up" bugs. We actively unregister any
// leftover SW in dev so switching between branches/experiments doesn't leave a
// stale worker behind from an earlier session.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js");
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()));
    }
  }, []);

  return null;
}
