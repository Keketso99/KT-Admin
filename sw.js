// KT Admin Panel — Service Worker
// Intentionally network-only: this app must always reflect live server data.
// Its only job is to satisfy the browser's installability requirement.

const SW_VERSION = "kt-admin-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Always go to the network. No caching, no offline fallback —
  // by design, this app requires a live connection.
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        "<h1>No connection</h1><p>KT Admin requires an internet connection.</p>",
        { headers: { "Content-Type": "text/html" } }
      );
    })
  );
});
