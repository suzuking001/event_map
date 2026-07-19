const STATIC_CACHE = "static-v6";
const RUNTIME_CACHE = "runtime-v6";
const DATA_CACHE = "data-v6";
const TILE_CACHE = "tiles-v6";

const EVENT_REFRESH_PARAM = "_event_map_refresh";

const STATIC_ASSETS = [
  "index.html",
  "assets/styles.css?v=5",
  "assets/app.js?v=6",
  "assets/js/config.js?v=6",
  "assets/js/csv.js",
  "assets/js/utils.js",
  "assets/js/event-csv-worker.js?v=4",
  "data/current_and_future_events.csv",
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

const isCsvRequest = url => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.toLowerCase().endsWith(".csv");
};

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

const fetchFreshCsv = async request => {
  const response = await fetch(request);
  if (shouldCache(response)) {
    const canonicalUrl = new URL(request.url);
    canonicalUrl.searchParams.delete(EVENT_REFRESH_PARAM);
    const canonicalRequest = new Request(canonicalUrl.toString(), request);
    const cache = await caches.open(DATA_CACHE);
    await cache.put(canonicalRequest, response.clone());
  }
  return response;
};

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = request.url;
  const isSameOrigin = url.startsWith(self.location.origin);
  const parsedUrl = new URL(url);

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE).then(response => response || caches.match("index.html"))
    );
    return;
  }

  if (isCsvRequest(url)) {
    if (parsedUrl.searchParams.has(EVENT_REFRESH_PARAM)) {
      event.respondWith(fetchFreshCsv(request));
    } else {
      event.respondWith(cacheFirst(request, DATA_CACHE));
    }
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
