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

export function installAuth401Interceptor() {
  if (interceptorInstalled || typeof window === "undefined") return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (response.status === 401 && shouldHandleUnauthorized(input)) {
      handleUnauthorized();
    }

    return response;
  };
}
