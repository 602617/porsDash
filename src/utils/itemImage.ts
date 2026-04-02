export function resolveItemImageUrl(
  apiBaseUrl: string,
  imageUrl?: string | null,
  cacheBust?: string | number
): string | null {
  if (!imageUrl) return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  const normalizedBase = (apiBaseUrl || "").replace(/\/+$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const resolved = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : normalizedBase
      ? `${normalizedBase}${normalizedPath}`
      : normalizedPath;

  if (cacheBust === undefined || cacheBust === null || cacheBust === "") {
    return resolved;
  }

  const separator = resolved.includes("?") ? "&" : "?";
  return `${resolved}${separator}v=${encodeURIComponent(String(cacheBust))}`;
}
