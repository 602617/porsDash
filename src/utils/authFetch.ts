let interceptorInstalled = false;
let redirectInProgress = false;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

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

function handleUnauthorized() {
  localStorage.removeItem("jwt");

  if (redirectInProgress) return;
  if (window.location.pathname === "/login") return;

  redirectInProgress = true;
  const currentPath = getCurrentPathWithQuery();
  const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
  window.location.assign(loginUrl);
}

async function shouldHandleForbiddenAsUnauthorized(response: Response): Promise<boolean> {
  const bodyText = (await response.clone().text().catch(() => "")).trim().toLowerCase();
  if (!bodyText) return true;

  // Ownership checks in this app intentionally return 403 and should not force logout.
  if (bodyText.includes("du eier ikke")) return false;

  if (
    bodyText.includes("forbidden") ||
    bodyText.includes("access denied") ||
    bodyText.includes("unauthorized") ||
    bodyText.includes("full authentication")
  ) {
    return true;
  }

  // Fallback: treat unknown 403 bodies as auth failures to avoid stale-token loops.
  return true;
}

export function installAuth401Interceptor() {
  if (interceptorInstalled || typeof window === "undefined") return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (shouldHandleUnauthorized(input)) {
      if (response.status === 401) {
        handleUnauthorized();
      } else if (response.status === 403) {
        const shouldRedirect = await shouldHandleForbiddenAsUnauthorized(response);
        if (shouldRedirect) {
          handleUnauthorized();
        }
      }
    }

    return response;
  };
}
