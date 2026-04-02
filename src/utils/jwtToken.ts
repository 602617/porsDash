export function normalizeJwt(rawToken: string | null | undefined): string {
  const value = (rawToken || "").trim();
  if (!value || value === "null" || value === "undefined") return "";
  if (value.startsWith("Bearer ")) {
    return value.slice("Bearer ".length).trim();
  }
  return value;
}

export function readStoredJwt(): string {
  if (typeof window === "undefined") return "";
  return normalizeJwt(localStorage.getItem("jwt"));
}

export function storeJwt(rawToken: unknown): boolean {
  if (typeof window === "undefined") return false;
  const token = typeof rawToken === "string" ? normalizeJwt(rawToken) : "";
  if (!token) {
    localStorage.removeItem("jwt");
    return false;
  }
  localStorage.setItem("jwt", token);
  return true;
}
