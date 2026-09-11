/*
 * YProgress service worker.
 *
 * Règle importante : la navigation et index.html sont en NETWORK-FIRST.
 * En cache-first, index.html restait figé et pointait vers un ancien bundle :
 * l'application ne se mettait jamais à jour après un déploiement.
 *
 * CACHE doit être incrémenté à chaque release (voir package.json "version").
 */
const VERSION = "16.0.0";
const CACHE = `yprogress-${VERSION}`;
const CORE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_expo/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?|ttf|webmanifest)$/.test(url.pathname)
  );
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || (await caches.match("/")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Le coach IA ne doit jamais être servi depuis le cache.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith("/index.html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
