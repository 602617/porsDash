/* /public/sw.js */
import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "PorsDash";
  const body = data.body || "You have a new notification";
  const url = data.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192-v2.png",
      data: { url },
      tag: `booking-${Date.now()}`,
    }),
  );
});

const INTERNAL_ROUTE_PREFIXES = [
  "/items",
  "/events",
  "/dashboard",
  "/profile",
  "/myproducts",
  "/dugnad",
  "/notifications",
  "/loan",
  "/game",
  "/handlelister",
  "/nydash",
  "/nyevent",
  "/testpage",
  "/login",
];

const isInternalPath = (path) => {
  if (path === "/") return true;
  return INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};

const resolveNotificationTarget = (url) => {
  const fallback = new URL("/", self.location.origin).href;
  if (!url) return fallback;

  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin === self.location.origin) return parsed.href;

    const internalCandidate = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (isInternalPath(parsed.pathname)) {
      return new URL(internalCandidate, self.location.origin).href;
    }

    return parsed.href;
  } catch {
    const normalized = String(url).startsWith("/") ? url : `/${url}`;
    return new URL(normalized, self.location.origin).href;
  }
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = resolveNotificationTarget(event.notification?.data?.url);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (client.url === target && "focus" in client) {
          await client.focus();
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
