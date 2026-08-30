// ============================================================
// NITYASĀDHANĀ — SERVICE WORKER (PWA & OFFLINE SHELL)
// ============================================================
// Caches application shell, static assets, and offline fallback.
// Strictly ignores Clerk auth, API endpoints, and private queries.
// ============================================================

const CACHE_VERSION = "v2";
const CACHE_STATIC = `nityasadhana-static-${CACHE_VERSION}`;
const CACHE_PAGES = `nityasadhana-pages-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/offline.html",
  "/icon.svg",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

// Install Event: Precache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated cache versions
self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_STATIC, CACHE_PAGES];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !allowedCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Selective Caching & Offline Fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only intercept GET requests
  if (request.method !== "GET") {
    return;
  }

  // 2. Strictly bypass Clerk auth, Cloudflare CAPTCHA/Turnstile, Next Server Actions, and API routes
  if (
    url.hostname.includes("clerk") ||
    url.hostname.includes("cloudflare") ||
    url.hostname.includes("challenges.cloudflare.com") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__clerk") ||
    url.pathname.startsWith("/_clerk") ||
    request.headers.get("x-action") ||
    request.headers.get("next-action")
  ) {
    return;
  }

  // 3. Navigation Requests (HTML Pages) -> Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid page, cache for offline reading
          if (response && response.status === 200 && response.type === "basic") {
            const responseClone = response.clone();
            caches.open(CACHE_PAGES).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // If network failed, check page cache or return offline shell
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          const offlineFallback = await caches.match("/offline.html");
          return offlineFallback || new Response("Offline · Nityasādhanā", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // 4. Static Assets (_next/static, fonts, icons) -> Cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === "basic" || networkResponse.type === "cors")
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});
