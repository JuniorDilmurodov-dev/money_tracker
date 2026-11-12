/**
 * Xarajat's service worker.
 *
 * Deliberately small. Serwist and next-pwa both still want a webpack config,
 * and this project builds with Turbopack — but the whole benefit here is two
 * rules, so there is nothing to generate:
 *
 *   1. Hashed build assets are served from cache, so a cold launch from the
 *      home screen paints without waiting on the network.
 *   2. A navigation that cannot reach the network falls back to `/offline`
 *      instead of the browser's dinosaur.
 *
 * What it deliberately does NOT do is cache any page or payload that carries a
 * signed-in user's data. Every route in this app is per-user and lives behind
 * Supabase auth; a cached copy would outlive the session and could be handed
 * to whoever holds the phone next. Only immutable build output and the two
 * public assets below are ever stored.
 */

// Bump on any change to PRECACHE or to the rules below — `activate` deletes
// every cache that doesn't match, which is what evicts the old build.
const VERSION = "v3";
const CACHE = `xarajat-${VERSION}`;

const OFFLINE_URL = "/offline";

/** Public, user-independent, and needed precisely when the network is gone. */
const PRECACHE = [OFFLINE_URL, "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // If `addAll` rejects, install fails and the old worker stays in charge —
      // which is the outcome we want over a half-populated cache.
      .then((cache) => cache.addAll(PRECACHE))
      // Only immutable build output is cached, so taking over immediately
      // can't swap an asset out from under a running page.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Hashed, immutable build output — safe to serve from cache forever. */
function isBuildAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/** Nothing here may be cached: auth cookies, user rows, model output. */
function isPrivate(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/login") ||
    // React Server Component payloads for an authenticated page.
    url.searchParams.has("_rsc")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Server Actions are POSTs and must always reach the server.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivate(url)) return;

  if (isBuildAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            // Opaque and error responses would poison the cache for a build
            // that is otherwise fine.
            if (response.ok && response.type === "basic") {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(OFFLINE_URL)) ??
          new Response("", { status: 504, statusText: "Offline" }),
      ),
    );
  }
});

/**
 * The daily reminder is deliberately generic — never an amount or balance.
 * The Sunday weekly digest is the one exception: it carries a rounded weekly
 * total on purpose, so it shows on the lock screen. This is the Push API, not
 * Cache Storage, so it doesn't touch the "never cache user data" rule above.
 */
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Xarajat", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Resolve against our own origin so a payload can only ever open a page of
  // this app, and so "/haftalik?w=…" compares equal to a client's full URL.
  const target = new URL(event.notification.data?.url ?? "/", self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        const sameOrigin = clientList.filter(
          (client) => new URL(client.url).origin === target.origin,
        );
        const exact = sameOrigin.find((client) => client.url === target.href);
        if (exact) return exact.focus();

        // An app window is already open on some other page: take it to the
        // target instead of leaving the tap looking like it did nothing.
        const open = sameOrigin[0];
        if (open) {
          try {
            const navigated = await open.navigate(target.href);
            return (navigated ?? open).focus();
          } catch {
            // navigate() is refused for windows this worker doesn't control.
          }
        }
        return self.clients.openWindow(target.href);
      }),
  );
});
