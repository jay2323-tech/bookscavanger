/* BookScavenger PWA — cache shell for offline reopen */
const CACHE = "bookscavanger-shell-v2";
const PRECACHE = ["/", "/search", "/plan", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
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
    url.hostname === "localhost" && url.port === "8080"
  ) {
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
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Cache-first for static (don't throw if network fails)
  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      } catch {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })
  );
});
