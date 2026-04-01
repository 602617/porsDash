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
      data: { ...data, url },
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
  "/mybookings",
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

const mapApiPathToInternalPath = (path) => {
  if (!path) return "/";

  if (/^\/api\/notifications(\/.*)?$/i.test(path)) {
    return "/notifications";
  }

  if (path.startsWith("/api/")) {
    return path.slice(4);
  }

  if (path.startsWith("api/")) {
    return `/${path.slice(4)}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const getDirectBookingPath = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const itemId = payload.itemId ?? payload.item_id;
  const bookingId = payload.bookingId ?? payload.booking_id;
  if (!itemId || !bookingId) return null;
  return `/items/${itemId}/bookings/${bookingId}`;
};

const toAppEntryUrl = (internalPath) => {
  const normalized = internalPath.startsWith("/") ? internalPath : `/${internalPath}`;
  if (normalized === "/") {
    return new URL("/", self.location.origin).href;
  }
  const query = `/?redirect=${encodeURIComponent(normalized)}`;
  return new URL(query, self.location.origin).href;
};

const resolveNotificationTarget = (payloadOrUrl) => {
  const fallback = new URL("/", self.location.origin).href;
  if (!payloadOrUrl) return fallback;

  const directBookingPath =
    typeof payloadOrUrl === "object" ? getDirectBookingPath(payloadOrUrl) : null;
  const url =
    directBookingPath ||
    (typeof payloadOrUrl === "string" ? payloadOrUrl : payloadOrUrl.url);
  if (!url) return fallback;

  try {
    const parsed = new URL(url, self.location.origin);
    const mappedPath = mapApiPathToInternalPath(parsed.pathname);
    const internalCandidate = `${mappedPath}${parsed.search}${parsed.hash}`;
    if (parsed.origin === self.location.origin && isInternalPath(mappedPath)) {
      return toAppEntryUrl(internalCandidate);
    }

    if (isInternalPath(mappedPath)) {
      return toAppEntryUrl(internalCandidate);
    }

    return parsed.href;
  } catch {
    const normalizedPath = mapApiPathToInternalPath(String(url));
    if (isInternalPath(normalizedPath)) {
      return toAppEntryUrl(normalizedPath);
    }
    return new URL(normalizedPath, self.location.origin).href;
  }
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = resolveNotificationTarget(event.notification?.data);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const targetOrigin = new URL(target).origin;

      for (const client of windows) {
        const clientOrigin = new URL(client.url).origin;
        if (clientOrigin === targetOrigin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
