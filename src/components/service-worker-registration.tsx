"use client";

import { useEffect } from "react";

// Turns on /sw.js (the service worker -- see public/sw.js for the full
// explanation) so the browser starts running it in the background. This is
// required both for the app to be installable and for push notifications
// to work.
//
// This only happens in the production build. During development, the dev
// server rebuilds and serves files constantly, and a service worker's
// caching would fight against that, causing confusing "why isn't my change
// showing up" moments. So in development this instead actively turns off
// any service worker left over from an earlier session, so it doesn't
// linger and cause that problem.
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
