// Write It PWA: own cache namespace only; do not delete another app's CacheStorage.
const SHELL_CACHE = "zi-shell-v5";
const DATA_CACHE = "zi-data-v1";
const DATA_URL_PREFIX =
  "https://cdn.jsdelivr.net/gh/puran1218/write-it@data-v1/static/zi/data/";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  // CacheStorage belongs to the origin, not the /zi/ scope.
  // Delete only known Write It generations, never caches owned by other apps.
  const isOwnCache = key =>
    key.startsWith("zi-shell-") || key.startsWith("zi-data-") || key === "zi-v2";
  const keep = new Set([SHELL_CACHE, DATA_CACHE]);
  event.waitUntil(Promise.all([
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => isOwnCache(key) && !keep.has(key))
          .map(key => caches.delete(key))
      )
    ),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.href.startsWith(DATA_URL_PREFIX)) {
    // Version-pinned data: cache first. A failed CacheStorage write should
    // never turn a successful network response into an application error.
    let cacheWrite = Promise.resolve();
    const responsePromise = (async () => {
      let cache;
      try {
        cache = await caches.open(DATA_CACHE);
        const cached = await cache.match(event.request);
        if (cached) return cached;
      } catch {
        // Private browsing / storage quota: continue without persistent cache.
      }

      const response = await fetch(event.request);
      if (cache && response.ok) {
        cacheWrite = cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    })();

    event.respondWith(responsePromise);
    event.waitUntil(responsePromise.then(() => cacheWrite).catch(() => {}));
    return;
  }

  if (event.request.url.startsWith(self.registration.scope)) {
    // Micro.blog app shell: network first; previously cached assets when offline.
    let cacheWrite = Promise.resolve();
    const responsePromise = fetch(event.request, { cache: "no-cache" })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          cacheWrite = caches.open(SHELL_CACHE)
            .then(cache => cache.put(event.request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.open(SHELL_CACHE).then(cache => cache.match(event.request))
      );

    event.respondWith(responsePromise);
    event.waitUntil(responsePromise.then(() => cacheWrite).catch(() => {}));
  }
});
