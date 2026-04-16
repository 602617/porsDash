export type NotificationTarget =
  | { type: "internal"; to: string }
  | { type: "external"; to: string };

const hasProtocol = (value: string) => /^[a-z][a-z0-9+\-.]*:\/\//i.test(value);

const normalizePath = (value: string) => (value.startsWith("/") ? value : `/${value}`);

const toOrigin = (value?: string | null) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const mapApiPathToInternalPath = (path: string): string => {
  if (!path) return "/";

  // Common backend notification read/action endpoints should open the notifications page.
  if (/^\/api\/notifications(\/.*)?$/i.test(path)) {
    return "/notifications";
  }

  // Booking action endpoints should always open booking details in the SPA.
  // Examples:
  // /api/items/2/bookings/51/approve -> /items/2/bookings/51
  // /api/items/2/bookings/51/decline -> /items/2/bookings/51
  const bookingActionMatch =
    path.match(/^\/api\/items\/(\d+)\/bookings\/(\d+)\/[a-z-]+$/i) ||
    path.match(/^\/items\/(\d+)\/bookings\/(\d+)\/[a-z-]+$/i);
  if (bookingActionMatch) {
    return `/items/${bookingActionMatch[1]}/bookings/${bookingActionMatch[2]}`;
  }

  // Convert API URLs into SPA routes, e.g. /api/items/2/bookings/51 -> /items/2/bookings/51
  if (path.startsWith("/api/")) {
    return path.slice(4);
  }

  // Handle values like "api/items/2/bookings/51"
  if (path.startsWith("api/")) {
    return `/${path.slice(4)}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const isInternalPath = (path: string) =>
  path === "/" ||
  [
    "/items",
    "/events",
    "/dashboard",
    "/profile",
    "/myproducts",
    "/mybookings",
    "/dugnad",
    "/notifications",
    "/loan",
    "/loans",
    "/game",
    "/handlelister",
    "/nydash",
    "/nyevent",
    "/testpage",
    "/login",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const resolveNotificationTarget = (
  url?: string | null,
  apiBaseUrl?: string | null
): NotificationTarget | null => {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (!hasProtocol(trimmed)) {
    const parsed = new URL(normalizePath(trimmed), window.location.origin);
    const mappedPath = mapApiPathToInternalPath(parsed.pathname);
    const to = `${mappedPath}${parsed.search}${parsed.hash}`;
    return { type: "internal", to };
  }

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = window.location.origin;
    const apiOrigin = toOrigin(apiBaseUrl);
    const isKnownOrigin = parsed.origin === currentOrigin || parsed.origin === apiOrigin;

    if (isKnownOrigin) {
      const mappedPath = mapApiPathToInternalPath(parsed.pathname);
      const internalPath = `${mappedPath}${parsed.search}${parsed.hash}` || "/";
      return { type: "internal", to: internalPath };
    }

    const mappedPath = mapApiPathToInternalPath(parsed.pathname);
    if (isInternalPath(mappedPath)) {
      return { type: "internal", to: `${mappedPath}${parsed.search}${parsed.hash}` };
    }

    return { type: "external", to: parsed.toString() };
  } catch {
    const fallbackPath = mapApiPathToInternalPath(normalizePath(trimmed));
    return { type: "internal", to: fallbackPath };
  }
};
