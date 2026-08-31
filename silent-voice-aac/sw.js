const CACHE = "silent-voice-aac-v4";
const LOCAL = ["./", "./index.html", "./styles.css?v=20260831-4", "./app.js?v=20260831-4", "./lip-engine.js?v=20260831-4", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(LOCAL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const isCode = /\.(?:js|css|html)$/.test(url.pathname) || url.pathname.endsWith("/");
  event.respondWith(
    fetch(event.request, isCode ? { cache: "no-store" } : undefined)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
