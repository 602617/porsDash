const LOGOUT_REASON_STORAGE_KEY = "auth_logout_reason";

export type AuthLogoutReason = "expired" | "invalid" | "manual";

export function normalizeJwt(rawToken: string | null | undefined): string {
  const value = (rawToken || "").trim();
  if (!value || value === "null" || value === "undefined") return "";
  if (value.startsWith("Bearer ")) {
    return value.slice("Bearer ".length).trim();
  }
  return value;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readJwtExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return null;
  }
  return exp * 1000;
}

export function isJwtExpired(token: string, nowMs = Date.now()): boolean {
  const expiryMs = readJwtExpiryMs(token);
  if (expiryMs == null) return false;
  return nowMs >= expiryMs;
}

function rememberLogoutReason(reason?: AuthLogoutReason): void {
  if (typeof window === "undefined") return;
  if (!reason || reason === "manual") {
    sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(LOGOUT_REASON_STORAGE_KEY, reason);
}

export function consumeAuthLogoutReason(): AuthLogoutReason | "" {
  if (typeof window === "undefined") return "";
  const rawReason = sessionStorage.getItem(LOGOUT_REASON_STORAGE_KEY) || "";
  sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY);
  if (rawReason === "expired" || rawReason === "invalid" || rawReason === "manual") {
    return rawReason;
  }
  return "";
}

export function clearStoredJwt(reason?: AuthLogoutReason): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("jwt");
  rememberLogoutReason(reason);
}

export function readStoredJwt(): string {
  if (typeof window === "undefined") return "";
  const token = normalizeJwt(localStorage.getItem("jwt"));
  if (!token) return "";
  if (isJwtExpired(token)) {
    clearStoredJwt("expired");
    return "";
  }
  return token;
}

export function storeJwt(rawToken: unknown): boolean {
  if (typeof window === "undefined") return false;
  const token = typeof rawToken === "string" ? normalizeJwt(rawToken) : "";
  if (!token) {
    clearStoredJwt();
    return false;
  }
  rememberLogoutReason();
  localStorage.setItem("jwt", token);
  return true;
}
