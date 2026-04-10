const STORAGE_KEY_PREFIX = "persistent_booking_requests_v1";
const LEGACY_STORAGE_KEY = "persistent_booking_requests_v1";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DECLINED";

export interface NotificationLike {
  id: number;
  message: string;
  url?: string | null;
}

export interface PersistentBookingRequest {
  key: string;
  notificationId?: number;
  itemId: number;
  bookingId: number;
  message: string;
  url: string;
  itemName: string;
  ownerUsername?: string;
  requesterUsername?: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  firstSeenAt: string;
  updatedAt: string;
}

interface BookingDto {
  id?: number;
  startTime?: string;
  endTime?: string;
  status?: BookingStatus | string;
  username?: string;
}

interface ItemDto {
  id?: number;
  name?: string;
  username?: string;
}

interface BookingRef {
  itemId: number;
  bookingId: number;
}

type MergeSource = {
  itemId: number;
  bookingId: number;
  notificationId?: number;
  message?: string;
  url?: string | null;
};

const BOOKING_PATH_PATTERN = /\/(?:api\/)?items\/(\d+)\/bookings\/(\d+)(?:\/|$)/i;

function normalizeToken(token: string | null | undefined): string {
  const value = (token || "").trim();
  if (!value) return "";
  if (value.startsWith("Bearer ")) {
    return value.slice("Bearer ".length).trim();
  }
  return value;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const safeToken = normalizeToken(token);
  if (!safeToken) return null;
  const parts = safeToken.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = window.atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userScopeForToken(token?: string): string {
  const payload = parseJwtPayload(token || "");
  const identity =
    payload?.sub ||
    payload?.preferred_username ||
    payload?.username ||
    payload?.email ||
    payload?.userId;
  if (typeof identity !== "string" || !identity.trim()) return "anonymous";
  return identity.trim().toLowerCase();
}

function storageKeyForToken(token?: string): string {
  const scope = userScopeForToken(token);
  return `${STORAGE_KEY_PREFIX}:${scope}`;
}

function bookingKey(itemId: number, bookingId: number): string {
  return `${itemId}:${bookingId}`;
}

function normalizeBookingStatus(status: unknown): BookingStatus {
  if (status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED" || status === "DECLINED") {
    return status;
  }
  return "PENDING";
}

function parseBookingRefFromUrl(rawUrl?: string | null): BookingRef | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let path = trimmed;
  try {
    path = new URL(trimmed, window.location.origin).pathname;
  } catch {
    path = trimmed;
  }

  const match = path.match(BOOKING_PATH_PATTERN);
  if (!match) return null;

  const itemId = Number.parseInt(match[1], 10);
  const bookingId = Number.parseInt(match[2], 10);
  if (!Number.isFinite(itemId) || !Number.isFinite(bookingId)) return null;
  return { itemId, bookingId };
}

function toInternalBookingUrl(url: string | null | undefined, itemId: number, bookingId: number): string {
  if (!url) return `/items/${itemId}/bookings/${bookingId}`;
  const trimmed = url.trim();
  if (!trimmed) return `/items/${itemId}/bookings/${bookingId}`;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const path = parsed.pathname.replace(/^\/api(?=\/)/i, "");
    return `${path}${parsed.search}${parsed.hash}` || `/items/${itemId}/bookings/${bookingId}`;
  } catch {
    return `/items/${itemId}/bookings/${bookingId}`;
  }
}

function isExpired(endTime: string, nowMs: number): boolean {
  const endMs = Date.parse(endTime);
  if (Number.isNaN(endMs)) return false;
  return endMs <= nowMs;
}

function sortByEndDate(list: PersistentBookingRequest[]): PersistentBookingRequest[] {
  return [...list].sort((a, b) => {
    const aMs = Date.parse(a.endTime);
    const bMs = Date.parse(b.endTime);
    if (Number.isNaN(aMs) && Number.isNaN(bMs)) return a.bookingId - b.bookingId;
    if (Number.isNaN(aMs)) return 1;
    if (Number.isNaN(bMs)) return -1;
    return aMs - bMs;
  });
}

function readRawList(token?: string): PersistentBookingRequest[] {
  try {
    const raw = localStorage.getItem(storageKeyForToken(token));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PersistentBookingRequest => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Partial<PersistentBookingRequest>;
      return (
        typeof candidate.key === "string" &&
        typeof candidate.itemId === "number" &&
        typeof candidate.bookingId === "number" &&
        typeof candidate.message === "string" &&
        typeof candidate.url === "string" &&
        typeof candidate.startTime === "string" &&
        typeof candidate.endTime === "string" &&
        typeof candidate.status === "string" &&
        typeof candidate.firstSeenAt === "string" &&
        typeof candidate.updatedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeRawList(list: PersistentBookingRequest[], token?: string) {
  try {
    localStorage.setItem(storageKeyForToken(token), JSON.stringify(list));
  } catch {
    // Ignore localStorage write errors.
  }
}

function pruneExpired(list: PersistentBookingRequest[], nowMs = Date.now()): PersistentBookingRequest[] {
  return list.filter((entry) => !isExpired(entry.endTime, nowMs));
}

async function fetchBookingDetails(
  apiBaseUrl: string,
  token: string,
  itemId: number,
  bookingId: number,
  includeItem: boolean
): Promise<{ booking: BookingDto | null; item: ItemDto | null; missing: boolean }> {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const bookingPromise = fetch(`${apiBaseUrl}/api/items/${itemId}/bookings/${bookingId}`, { headers });
  const itemPromise = includeItem
    ? fetch(`${apiBaseUrl}/api/items/${itemId}`, { headers })
    : Promise.resolve(null);

  const [bookingRes, itemRes] = await Promise.all([bookingPromise, itemPromise]);

  if (bookingRes.status === 404) {
    return { booking: null, item: null, missing: true };
  }
  if (bookingRes.status === 401 || bookingRes.status === 403) {
    return { booking: null, item: null, missing: true };
  }

  let booking: BookingDto | null = null;
  if (bookingRes.ok) {
    booking = (await bookingRes.json()) as BookingDto;
  }

  let item: ItemDto | null = null;
  if (itemRes && itemRes.ok) {
    item = (await itemRes.json()) as ItemDto;
  }

  return { booking, item, missing: false };
}

function mergeRequest(
  source: MergeSource,
  booking: BookingDto | null,
  item: ItemDto | null,
  existing: PersistentBookingRequest | undefined
): PersistentBookingRequest {
  const key = bookingKey(source.itemId, source.bookingId);
  const nowIso = new Date().toISOString();
  const fallbackMessage = existing?.message || "Ny bookingforesporsel";

  return {
    key,
    notificationId: source.notificationId ?? existing?.notificationId,
    itemId: source.itemId,
    bookingId: source.bookingId,
    message: source.message?.trim() || fallbackMessage,
    url: toInternalBookingUrl(source.url ?? existing?.url, source.itemId, source.bookingId),
    itemName: item?.name || existing?.itemName || `Produkt #${source.itemId}`,
    ownerUsername: item?.username || existing?.ownerUsername,
    requesterUsername: booking?.username || existing?.requesterUsername,
    startTime: booking?.startTime || existing?.startTime || "",
    endTime: booking?.endTime || existing?.endTime || "",
    status: normalizeBookingStatus(booking?.status ?? existing?.status),
    firstSeenAt: existing?.firstSeenAt || nowIso,
    updatedAt: nowIso,
  };
}

export function clearPersistentBookingRequests(token?: string) {
  try {
    localStorage.removeItem(storageKeyForToken(token));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore localStorage delete errors.
  }
}

export function clearAllPersistentBookingRequests() {
  try {
    const toDelete: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (key === LEGACY_STORAGE_KEY || key.startsWith(`${STORAGE_KEY_PREFIX}:`)) {
        toDelete.push(key);
      }
    }
    toDelete.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore localStorage delete errors.
  }
}

export function readPersistentBookingRequests(token?: string): PersistentBookingRequest[] {
  const cleaned = sortByEndDate(pruneExpired(readRawList(token)));
  writeRawList(cleaned, token);
  return cleaned;
}

export async function seedPersistentBookingRequestsFromNotifications(options: {
  apiBaseUrl: string;
  token: string;
  notifications: NotificationLike[];
}): Promise<PersistentBookingRequest[]> {
  const { apiBaseUrl, token, notifications } = options;
  if (!apiBaseUrl || !token) {
    return readPersistentBookingRequests(token);
  }

  const base = readPersistentBookingRequests(token);
  const byKey = new Map(base.map((entry) => [entry.key, entry]));

  const matches: MergeSource[] = [];
  notifications.forEach((note) => {
    const ref = parseBookingRefFromUrl(note.url);
    if (!ref) return;
    matches.push({
      ...ref,
      notificationId: note.id,
      message: note.message,
      url: note.url,
    });
  });

  await Promise.all(
    matches.map(async (match) => {
      const key = bookingKey(match.itemId, match.bookingId);
      const existing = byKey.get(key);
      try {
        const details = await fetchBookingDetails(
          apiBaseUrl,
          token,
          match.itemId,
          match.bookingId,
          true
        );
        if (details.missing) {
          byKey.delete(key);
          return;
        }
        const merged = mergeRequest(match, details.booking, details.item, existing);
        if (!isExpired(merged.endTime, Date.now())) {
          byKey.set(key, merged);
        } else {
          byKey.delete(key);
        }
      } catch {
        const merged = mergeRequest(match, null, null, existing);
        byKey.set(key, merged);
      }
    })
  );

  const next = sortByEndDate(pruneExpired([...byKey.values()]));
  writeRawList(next, token);
  return next;
}

export async function refreshPersistentBookingRequests(options: {
  apiBaseUrl: string;
  token: string;
}): Promise<PersistentBookingRequest[]> {
  const { apiBaseUrl, token } = options;
  if (!apiBaseUrl || !token) {
    return readPersistentBookingRequests(token);
  }

  const base = readPersistentBookingRequests(token);
  const next = await Promise.all(
    base.map(async (entry) => {
      try {
        const details = await fetchBookingDetails(
          apiBaseUrl,
          token,
          entry.itemId,
          entry.bookingId,
          true
        );
        if (details.missing) return null;
        const merged = mergeRequest(
          {
            itemId: entry.itemId,
            bookingId: entry.bookingId,
            message: entry.message,
            notificationId: entry.notificationId,
            url: entry.url,
          },
          details.booking,
          details.item,
          entry
        );
        if (isExpired(merged.endTime, Date.now())) return null;
        return merged;
      } catch {
        if (isExpired(entry.endTime, Date.now())) return null;
        return entry;
      }
    })
  );

  const cleaned = sortByEndDate(next.filter((entry): entry is PersistentBookingRequest => entry !== null));
  writeRawList(cleaned, token);
  return cleaned;
}

export async function syncPersistentBookingRequestsFromOwnerItems(options: {
  apiBaseUrl: string;
  token: string;
}): Promise<PersistentBookingRequest[]> {
  const { apiBaseUrl, token } = options;
  if (!apiBaseUrl || !token) {
    return readPersistentBookingRequests(token);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const myProductsRes = await fetch(`${apiBaseUrl}/api/items/myproducts`, { headers });
  if (!myProductsRes.ok) {
    if (myProductsRes.status === 401 || myProductsRes.status === 403) {
      clearPersistentBookingRequests(token);
      return [];
    }
    const text = await myProductsRes.text().catch(() => "");
    throw new Error(text || `Kunne ikke hente produkter (${myProductsRes.status})`);
  }

  const products = (await myProductsRes.json()) as ItemDto[];
  const byKey = new Map(readPersistentBookingRequests(token).map((entry) => [entry.key, entry]));

  await Promise.all(
    (Array.isArray(products) ? products : []).map(async (product) => {
      const itemId = Number(product.id);
      if (!Number.isFinite(itemId)) return;

      try {
        const bookingsRes = await fetch(`${apiBaseUrl}/api/items/${itemId}/bookings`, { headers });
        if (!bookingsRes.ok) return;

        const bookings = (await bookingsRes.json()) as BookingDto[];
        if (!Array.isArray(bookings)) return;

        bookings.forEach((booking) => {
          const bookingId = Number(booking.id);
          if (!Number.isFinite(bookingId)) return;

          const key = bookingKey(itemId, bookingId);
          const merged = mergeRequest(
            {
              itemId,
              bookingId,
              message: byKey.get(key)?.message || "Bookingforesporsel",
              url: `/items/${itemId}/bookings/${bookingId}`,
            },
            booking,
            product,
            byKey.get(key)
          );

          if (isExpired(merged.endTime, Date.now())) {
            byKey.delete(key);
            return;
          }
          byKey.set(key, merged);
        });
      } catch {
        // Ignore per-item booking sync errors so one failing item does not break the whole list.
      }
    })
  );

  const cleaned = sortByEndDate(pruneExpired([...byKey.values()]));
  writeRawList(cleaned, token);
  return cleaned;
}
