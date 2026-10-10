// KT Admin Panel — Service Worker
// Network-only for pages (this app must always reflect live server data),
// plus Web Push so admins are alerted even when the app is closed.

const SW_VERSION = "kt-admin-v4";

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
