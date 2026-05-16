/* Ozil Cuts service worker.
 *
 * Goals:
 *  - Provide an offline fallback for navigations so installed users
 *    aren't dumped into the browser's "no internet" page.
 *  - Cache hashed Next.js static assets aggressively (cache-first)
 *    to keep repeat loads snappy.
 *  - NEVER cache authenticated API traffic, OAuth flows, the
 *    manifest, or other dynamic surfaces — those always go to the
 *    network so users see fresh data and tokens.
 *
 * Bump CACHE_VERSION whenever this file changes; old caches are
 * pruned during `activate`.
 */

const CACHE_VERSION = "offline-v2";
const PRECACHE = `ozilcuts-precache-${CACHE_VERSION}`;
const RUNTIME_STATIC = `ozilcuts-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache
              .add(new Request(url, { cache: "reload" }))
              .catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const allowed = new Set([PRECACHE, RUNTIME_STATIC]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ozilcuts-") && !allowed.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  const pathname = url.pathname;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/sanctum/")) return true;
  if (pathname.startsWith("/oauth/")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/user/login")) return true;
  if (pathname.startsWith("/user/register")) return true;
  if (pathname === "/sw.js") return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (pathname.startsWith("/manifest-icon-")) return true;
  return false;
}

function isStaticAsset(url) {
  const pathname = url.pathname;
  if (pathname.startsWith("/_next/static/")) return true;
  if (pathname === "/icon" || pathname === "/apple-icon") return true;
  return /\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp|avif)$/i.test(
    pathname,
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (shouldBypass(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(PRECACHE);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ??
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok && response.type !== "opaque") {
            cache.put(request, response.clone()).catch(() => undefined);
          }
          return response;
        } catch (error) {
          if (cached) return cached;
          throw error;
        }
      }),
    );
  }
});
