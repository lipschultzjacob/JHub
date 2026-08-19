// Service workers run in their own worker context (no DOM access), separate from
// the page. Once registered, this script keeps running in the background even
// when no tab is open — that's what makes push notifications possible, and it's
// also what enables offline behavior and installability.
//
// This file lives in /public (not /src) because service workers are plain
// browser JS with no build step — Next.js just serves it as-is at /sw.js.
// Registration scope is tied to where the file is served from, so keeping it
// at the domain root lets it control every page in the app.

const CACHE_NAME = "jhub-shell-v1";
// Only the shell/start page is precached for now. As real routes/assets are
// added we can expand this list — bump CACHE_NAME when the caching strategy
// changes so old caches get cleaned up (see "activate" below).
const PRECACHE_URLS = ["/"];

// Fires once, when the browser first installs this SW version.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Don't wait for old tabs to close before this version takes over.
  self.skipWaiting();
});

// Fires after install, once this SW is ready to control pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // start controlling already-open tabs immediately
  );
});

// Network-first: always prefer a fresh response, and only fall back to the
// cached shell if the network request fails (i.e. offline). This avoids the
// classic PWA trap of serving stale content while actively developing/using the app.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request, { ignoreSearch: true }).then(
      (cached) => cached || caches.match("/")
    ))
  );
});

// --- Push notifications ---
// This is a stub for now; the real payload shape (transaction amount, merchant,
// category options) gets defined when the Plaid webhook -> push pipeline is built.
// A "push" event fires when the browser receives a push message from the server,
// even if no tab is open.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "JHub";
  const options = {
    body: data.body || "You have a new notification.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data.url || "/",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Fires when the user taps/clicks a notification we showed above.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Reuse an already-open tab if one exists, instead of opening a new one.
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
