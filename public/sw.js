// This is the "service worker" -- a small script the browser runs in the
// background, completely separate from any open tab (it can't even see or
// touch the page's content directly). Once turned on, it keeps running even
// after every tab of the app is closed. That's what makes two things
// possible: receiving push notifications, and letting the app work (at
// least partly) without an internet connection.
//
// This file lives in /public (not /src) because service workers are plain
// browser JavaScript with no build/compile step -- Next.js just hands it to
// the browser as-is, at the address /sw.js. A service worker only controls
// pages that live at or below the folder it's served from, so keeping this
// file at the very root of the site lets it control every page in the app.

const CACHE_NAME = "jhub-shell-v1";
// "Precaching" means saving a copy of something before it's even needed, so
// it's available offline right away. Only the home page is saved for now.
// If this caching strategy changes later, bump the version number in
// CACHE_NAME (e.g. to "-v2") -- that's what tells the "activate" step below
// to throw away the old saved copies and start fresh.
const PRECACHE_URLS = ["/"];

// "install" fires once, the first time the browser downloads this exact
// version of the file.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Take over immediately instead of waiting for every open tab to be closed first.
  self.skipWaiting();
});

// "activate" fires right after install, once this version is actually ready
// to start handling pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          // Delete any cache left over from an older version of this file.
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // start controlling tabs that were already open, not just new ones
  );
});

// Every network request the page makes passes through here first.
// Strategy: always try to get a fresh response from the actual network first,
// and only use the saved offline copy if that fails (i.e. you're offline).
// This avoids a common mistake with offline-capable sites, where an old
// cached version keeps getting shown even once a newer one is available.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request, { ignoreSearch: true }).then(
      (cached) => cached || caches.match("/")
    ))
  );
});

// --- Push notifications ---
// This is a placeholder for now -- the real shape of the data (transaction
// amount, merchant, category choices) will be defined once the Plaid ->
// notification pipeline is actually built. A "push" event fires whenever the
// browser receives a push message sent from our server, even if the app
// isn't open at the time.
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

// Fires when someone taps/clicks a notification we showed above.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If a tab with this app is already open, jump to it instead of opening a new one.
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
