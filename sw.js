// KT Admin Panel — Service Worker
// Network-only for pages (this app must always reflect live server data),
// plus Web Push so admins are alerted even when the app is closed.

const SW_VERSION = "kt-admin-v36";

const OFFLINE_CACHE = "kt-admin-offline-v1";
const OFFLINE_FILES = ["offline.html", "icons/icon-192.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Keep the "You're offline" page ready for when the app is opened without internet.
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_FILES.map((f) => new URL(f, self.registration.scope).href)))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  // Always go to the network: the app must show live data (no page caching).
  // Only when opening the app with no connection, show the offline page.
  event.respondWith(
    fetch(event.request).catch(async () => {
      if (event.request.mode === "navigate") {
        const cached = await caches.match(new URL("offline.html", self.registration.scope).href);
        if (cached) return cached;
        return new Response(
          "<h1>You're offline</h1>",
          { headers: { "Content-Type": "text/html" } }
        );
      }
      return Response.error();
    })
  );
});

// ---------------------------------------------------------
// PUSH
// ---------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "KT Admin", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil((async () => {
    // If the admin is looking at the app right now, the in-app pop-up
    // already shows it — no second alert.
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const looking = wins.some((w) => w.visibilityState === "visible" && w.focused);
    if (looking) return;

    const icon = new URL("icons/icon-192.png", self.registration.scope).href;

    await self.registration.showNotification(data.title || "KT Admin", {
      body: data.body || "",
      icon,
      badge: icon,
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { page: data.page || "notifications" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const page = (event.notification.data && event.notification.data.page) || "notifications";

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    if (wins.length > 0) {
      const win = wins[0];
      try { await win.focus(); } catch (e) { /* ignore */ }
      win.postMessage({ type: "kt-open-page", page });
      return;
    }

    await self.clients.openWindow(new URL("admin.html?page=" + encodeURIComponent(page), self.registration.scope).href);
  })());
});
