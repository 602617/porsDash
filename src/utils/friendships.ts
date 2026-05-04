export type FriendshipStatus = "PENDING" | "ACCEPTED" | string;

export interface FriendshipDto {
  friendshipId: number;
  userId: number;
  username: string;
  status: FriendshipStatus;
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildApiUrl(apiBaseUrl: string, path: string): string {
  const base = (apiBaseUrl || "").replace(/\/+$/, "");
  return `${base}${path}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function authRequestInit(token: string, init: RequestInit = {}): RequestInit {
  return {
    credentials: "include",
    ...init,
    headers: {
      ...authHeaders(token),
      ...(init.headers || {}),
    },
  };
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const text = (await response.text().catch(() => "")).trim();
  if (!text) {
    return new Error(fallback);
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      const message = toCleanString(parsed.message);
      const error = toCleanString(parsed.error);
      if (message) {
        return new Error(message);
      }
      if (error) {
        return new Error(error);
      }
    }
  } catch {
    // Fall back to plain-text body.
  }

  return new Error(text || fallback);
}

async function readJsonIfAny(response: Response): Promise<unknown> {
  const text = (await response.text().catch(() => "")).trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizeFriendship(raw: unknown): FriendshipDto | null {
  if (!isRecord(raw)) {
    return null;
  }

  const friendshipId = toInteger(raw.friendshipId ?? raw.id);
  const userId = toInteger(raw.userId ?? raw.user_id);
  const username = toCleanString(raw.username);
  if (friendshipId == null || userId == null || !username) {
    return null;
  }

  return {
    friendshipId,
    userId,
    username,
    status: toCleanString(raw.status) || "PENDING",
    createdAt: toCleanString(raw.createdAt ?? raw.created_at),
  };
}

export function normalizeFriendships(raw: unknown): FriendshipDto[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<number>();
  const friendships: FriendshipDto[] = [];
  for (const entry of raw) {
    const friendship = normalizeFriendship(entry);
    if (!friendship || seen.has(friendship.friendshipId)) {
      continue;
    }
    seen.add(friendship.friendshipId);
    friendships.push(friendship);
  }
  return friendships;
}

export function normalizeUserSearchResults(raw: unknown): UserSearchResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const users: UserSearchResult[] = [];
  const seenIds = new Set<number>();

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }

    const id = toInteger(entry.id ?? entry.userId ?? entry.user_id);
    const username = toCleanString(entry.username);
    if (id == null || !username || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    users.push({ id, username });
  }

  return users;
}

export async function searchUsers(
  apiBaseUrl: string,
  token: string,
  query: string,
  signal?: AbortSignal
): Promise<UserSearchResult[]> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, `/api/users/search?q=${encodeURIComponent(query)}`),
    authRequestInit(token, { signal })
  );

  if (!response.ok) {
    throw await responseError(response, `Could not search users (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  return normalizeUserSearchResults(payload);
}

export async function sendFriendRequest(
  apiBaseUrl: string,
  token: string,
  userId: number
): Promise<FriendshipDto | null> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, `/api/friendships/${userId}`),
    authRequestInit(token, { method: "POST" })
  );

  if (!response.ok) {
    throw await responseError(response, `Could not send friend request (${response.status})`);
  }

  const payload = await readJsonIfAny(response);
  return normalizeFriendship(payload);
}

export async function fetchFriends(apiBaseUrl: string, token: string): Promise<FriendshipDto[]> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, "/api/friendships"),
    authRequestInit(token)
  );

  if (!response.ok) {
    throw await responseError(response, `Could not load friends (${response.status})`);
  }

  return normalizeFriendships((await response.json()) as unknown);
}

export async function fetchPendingFriendRequests(
  apiBaseUrl: string,
  token: string
): Promise<FriendshipDto[]> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, "/api/friendships/pending"),
    authRequestInit(token)
  );

  if (!response.ok) {
    throw await responseError(response, `Could not load pending requests (${response.status})`);
  }

  return normalizeFriendships((await response.json()) as unknown);
}

export async function acceptFriendRequest(
  apiBaseUrl: string,
  token: string,
  friendshipId: number
): Promise<void> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, `/api/friendships/${friendshipId}/accept`),
    authRequestInit(token, { method: "POST" })
  );

  if (!response.ok) {
    throw await responseError(response, `Could not accept friend request (${response.status})`);
  }
}

export async function deleteFriendship(
  apiBaseUrl: string,
  token: string,
  friendshipId: number
): Promise<void> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, `/api/friendships/${friendshipId}`),
    authRequestInit(token, { method: "DELETE" })
  );

  if (!response.ok) {
    throw await responseError(response, `Could not remove friendship (${response.status})`);
  }
}
