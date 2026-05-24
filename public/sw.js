const CACHE_NAME = "tuhanas-cache-v2";
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/dashboard/pos",
  "/manifest.json",
  "/favicon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheAndReturn(request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") {
    return response;
  }
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => cacheAndReturn(request, response.clone()))
        .catch(async () => {
          const cachedResponse = await caches.match(request, { ignoreSearch: true });
          if (cachedResponse) return cachedResponse;
          
          // If we don't have the exact page, return the /dashboard/pos page as a fallback app shell
          // Next.js will hydrate it and might be able to recover or at least show the POS shell
          return caches.match("/dashboard/pos") || caches.match("/");
        })
    );
    return;
  }

  if (!sameOrigin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((response) => cacheAndReturn(request, response))
        .catch(async () => {
          if (request.destination === "image") {
            return caches.match("/icons/icon-192x192.png");
          }
          return null;
        });
    })
  );
});
