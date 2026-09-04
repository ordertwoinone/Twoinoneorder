/* Two In One — service worker
   Conservative, app-shell style caching. Never caches API/admin/auth so
   business logic and data stay live. Bumping CACHE_VERSION invalidates old caches. */
/* v4: the manifest's launch icons changed, and the old one is precached — a
   version bump is the only thing that gets an installed app to take the new
   splash artwork instead of the logo it was installed with. */
/* v5: /pos stopped being cached. Bumped so tablets already carrying till pages
   in tio-pages-v4 drop them rather than keep serving them offline. */
const CACHE_VERSION = "v5";
const STATIC_CACHE = `tio-static-${CACHE_VERSION}`;
const PAGES_CACHE = `tio-pages-${CACHE_VERSION}`;
const IMAGE_CACHE = `tio-images-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  // Still shipped: push notifications and the install card point at these.
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // What the launch screen is drawn from.
  "/icons/launch-512.png",
  "/logos/two-in-one.png",
  "/manifest.webmanifest",
];

const IMAGE_CACHE_LIMIT = 80;

self.addEventListener("install", (event) => {
  // Best-effort precache: a single failed asset must NOT abort installation.
  // If install fails the SW never activates, which makes the site appear
  // non-installable on Android (where an active SW is required to install).
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![STATIC_CACHE, PAGES_CACHE, IMAGE_CACHE].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never intercept dynamic/business endpoints — always hit the network.
  if (
    sameOrigin &&
    (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/auth/"))
  ) {
    return;
  }

  /*
   * The till, which must never be answered from a cache.
   *
   * Every page under /pos is rendered for whoever is signed in and for the
   * menu as it stands this minute: the cashier's name, their open shift, and
   * today's prices are all baked into the HTML. Serving a stored copy of that
   * would hand the next person the last person's screen — and quietly sell
   * yesterday's prices out of a dish that has since run out.
   *
   * It mattered less while the till was a browser tab that mostly had a
   * network. Installed as its own app it runs through this worker every time
   * it is opened, which is exactly when a stale page would be served.
   *
   * Answered with the offline page rather than passed through, so a tablet
   * that loses the wifi mid-shift gets a sentence explaining it instead of the
   * browser's own error — but never, under any circumstances, a till.
   */
  if (sameOrigin && url.pathname.startsWith("/pos")) {
    if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
    return;
  }

  // HTML navigations: network-first, fall back to cache, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  // Next static assets + local static files: cache-first (immutable hashed).
  if (
    sameOrigin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/logos/") ||
      url.pathname.startsWith("/fonts/"))
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Remote images (Supabase / Next image optimizer / Unsplash): stale-while-revalidate.
  const isImage =
    request.destination === "image" || url.pathname.startsWith("/_next/image");
  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) {
              cache.put(request, res.clone());
              trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }
});

// Allow the page to tell a waiting SW to take over immediately.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* ── Order alerts ──────────────────────────────────────────────────────────
   The only path that reaches an admin with the app closed. The payload is sent
   by /webhooks/takeapp; the defaults below cover a push that arrives without
   one, which some push services send to wake a worker. */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "New order";
  const options = {
    body: payload.body || "A new order has come in.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    // Same tag for one order, so an update replaces rather than stacks.
    tag: payload.tag || "takeapp-order",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: payload.url || "/admin/live-orders" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin/live-orders";

  // Focus the board if it is already open somewhere rather than opening a second copy.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/admin/live-orders") && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
