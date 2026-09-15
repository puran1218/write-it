// 字宝宝 · Write It — 部署壳（write-it-microblog 仓库）的 Service Worker。
//
// 两类资源，两种策略：
//   1. App shell（本域 /zi/*：index.html / app.js / styles.css …）
//      → 网络优先、缓存兜底：发布新版本后普通刷新即可拿到
//   2. 静态数据（cdn.jsdelivr.net/gh/puran1218/write-it@data-v1/...）
//      → 缓存优先：数据跟着不可变 tag 走，缓存后不再回源
//
// 约定：src/data-url.ts 里升数据 tag（data-v2…）时，把 DATA_CACHE 同步升位
//（zi-data-v2…），activate 时会清掉旧数据缓存。

const SHELL_CACHE = "zi-shell-v4";
const DATA_CACHE = "zi-data-v1";
const DATA_HOST = "cdn.jsdelivr.net";

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
  const keep = [SHELL_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => !keep.includes(key)).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }
  const url = new URL(event.request.url);

  // 静态数据（CDN，不可变版本）：缓存优先
  if (url.hostname === DATA_HOST) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(DATA_CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // App shell（本域）：网络优先，离线退回缓存
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" })
        .then(response => {
          if (response.ok && event.request.url.startsWith(self.registration.scope)) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // 其余跨域请求（麦克风权限页等）不拦截
});
