/* BookScavenger PWA — shell cache + network-first for hashed assets */
const CACHE = "bookscavanger-shell-v3";
const PRECACHE = ["/", "/search", "/plan", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch API, auth, Supabase, or library/admin auth flows
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/library/") ||
    url.pathname.startsWith("/admin/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("onrender") ||
    (url.hostname === "localhost" && url.port === "8080")
  ) {
    return;
  }

  // Network-first for Next hashed assets so deploys aren't stuck on stale JS/CSS
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for navigations; cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  // Stale-while-revalidate for other same-origin GETs (icons, etc.)
  event.respondWith(
    caches.match(request).then(async (cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        void network;
        return cached;
      }

      const res = await network;
      return res || new Response("", { status: 504, statusText: "Offline" });
    })
  );
});
