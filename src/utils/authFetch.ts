let interceptorInstalled = false;
let redirectInProgress = false;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function normalizeToken(rawToken: string | null | undefined): string {
  const token = (rawToken || "").trim();
  if (!token) return "";
  if (token.startsWith("Bearer ")) {
    return token.slice("Bearer ".length).trim();
  }
  return token;
}

function tokenFromHeaders(headers: Headers | null): string {
  if (!headers) return "";
  return normalizeToken(headers.get("Authorization"));
}

function requestTokenFromFetchArgs(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.headers) {
    try {
      return tokenFromHeaders(new Headers(init.headers));
    } catch {
      // Ignore header parsing failure and fall back to request object.
    }
  }
  if (input instanceof Request) {
    return tokenFromHeaders(input.headers);
  }
  return "";
}

function getRequestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof Request) {
      return new URL(input.url, window.location.origin);
    }
    if (input instanceof URL) {
      return new URL(input.toString(), window.location.origin);
    }
    return new URL(input, window.location.origin);
  } catch {
    return null;
  }
}

function shouldHandleUnauthorized(input: RequestInfo | URL): boolean {
  const requestUrl = getRequestUrl(input);
  if (!requestUrl) return false;

  const isApiRequest = apiBaseUrl
    ? requestUrl.href.startsWith(apiBaseUrl)
    : requestUrl.pathname.startsWith("/api/") || requestUrl.pathname.startsWith("/auth/");

  if (!isApiRequest) return false;
  if (requestUrl.pathname.endsWith("/auth/login")) {
    return false;
  }

  return true;
}

function getCurrentPathWithQuery(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function handleUnauthorized(requestToken = "") {
  const currentToken = normalizeToken(localStorage.getItem("jwt"));
  if (!currentToken) return;

  // Ignore stale responses from old requests/tokens.
  if (requestToken && requestToken !== currentToken) return;

  if (redirectInProgress) return;
  if (window.location.pathname === "/login") return;

  localStorage.removeItem("jwt");
  redirectInProgress = true;
  const currentPath = getCurrentPathWithQuery();
  const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
  window.location.assign(loginUrl);
}

async function shouldHandleForbiddenAsUnauthorized(response: Response): Promise<boolean> {
  const wwwAuth = response.headers.get("www-authenticate")?.toLowerCase() || "";
  if (wwwAuth.includes("bearer")) {
    return true;
  }

  const bodyText = (await response.clone().text().catch(() => "")).trim().toLowerCase();
  if (!bodyText) return false;

  // Ownership checks in this app intentionally return 403 and should not force logout.
  if (bodyText.includes("du eier ikke")) return false;

  if (
    bodyText.includes("unauthorized") ||
    bodyText.includes("full authentication") ||
    bodyText.includes("invalid token") ||
    bodyText.includes("jwt")
  ) {
    return true;
  }

  // Most 403 responses here are permission/ownership issues, not session expiry.
  return false;
}

export function installAuth401Interceptor() {
  if (interceptorInstalled || typeof window === "undefined") return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestToken = requestTokenFromFetchArgs(input, init);
    const response = await originalFetch(input, init);

    if (shouldHandleUnauthorized(input)) {
      if (response.status === 401) {
        handleUnauthorized(requestToken);
      } else if (response.status === 403) {
        const shouldRedirect = await shouldHandleForbiddenAsUnauthorized(response);
        if (shouldRedirect) {
          handleUnauthorized(requestToken);
        }
      }
    }

    return response;
  };
}
