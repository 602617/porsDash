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

export const resolveNotificationTarget = (
  url?: string | null,
  apiBaseUrl?: string | null
): NotificationTarget | null => {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (!hasProtocol(trimmed)) {
    return { type: "internal", to: normalizePath(trimmed) };
  }

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = window.location.origin;
    const apiOrigin = toOrigin(apiBaseUrl);
    const isKnownOrigin = parsed.origin === currentOrigin || parsed.origin === apiOrigin;

    if (isKnownOrigin) {
      const internalPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return { type: "internal", to: internalPath || "/" };
    }

    return { type: "external", to: parsed.toString() };
  } catch {
    return { type: "internal", to: normalizePath(trimmed) };
  }
};
