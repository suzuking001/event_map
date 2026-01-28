const STATIC_CACHE = "static-v1";
const RUNTIME_CACHE = "runtime-v1";
const DATA_CACHE = "data-v1";
const TILE_CACHE = "tiles-v1";

const STATIC_ASSETS = [
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/js/config.js",
  "assets/js/csv.js",
  "assets/js/utils.js",
  "assets/js/event-csv-worker.js",
  "manifest.webmanifest",
  "browserconfig.xml",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-150.png",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-192-maskable.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-512-maskable.png",
  "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(
            key =>
              key !== STATIC_CACHE &&
              key !== RUNTIME_CACHE &&
              key !== DATA_CACHE &&
              key !== TILE_CACHE
          )
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

const isCsvRequest = url =>
  url.includes("hamamatsu_event.csv") ||
  url.includes("/221309_hamamatsu_event/");

const isOsmTileRequest = url =>
  url.includes("tile.openstreetmap.org");

const shouldCache = response =>
  response && (response.ok || response.type === "opaque");

const cacheFirst = (request, cacheName) =>
  caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request)
      .then(response => {
        if (shouldCache(response)) {
          caches.open(cacheName).then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => cached);
  });

const networkFirst = (request, cacheName) =>
  fetch(request)
    .then(response => {
      if (shouldCache(response)) {
        caches.open(cacheName).then(cache => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => caches.match(request));

const staleWhileRevalidate = (request, cacheName, event) =>
  caches.match(request).then(cached => {
    const fetchPromise = fetch(request)
      .then(response => {
        if (shouldCache(response)) {
          caches.open(cacheName).then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => cached);
    if (cached) {
      if (event) {
        event.waitUntil(fetchPromise);
      }
      return cached;
    }
    return fetchPromise;
  });

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = request.url;
  const isSameOrigin = url.startsWith(self.location.origin);

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE).then(response => response || caches.match("index.html"))
    );
    return;
  }

  if (isCsvRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE, event));
    return;
  }

  if (isOsmTileRequest(url)) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }

  if (isSameOrigin) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }
});
