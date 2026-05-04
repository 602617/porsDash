import React, { useEffect, useState } from "react";
import { resolveItemImageUrl } from "../utils/itemImage";
import { readStoredJwt } from "../utils/jwtToken";

type AuthenticatedItemImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  apiBaseUrl: string;
  imageUrl?: string | null;
  fallbackSrc: string;
  cacheBust?: string | number;
};

function shouldFetchWithAuth(apiBaseUrl: string, resolvedUrl: string): boolean {
  try {
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const normalizedBase = (apiBaseUrl || "").replace(/\/+$/, "");
    const parsedUrl = new URL(resolvedUrl, baseOrigin);

    if (normalizedBase && !parsedUrl.href.startsWith(normalizedBase)) {
      return false;
    }

    return parsedUrl.pathname.startsWith("/api/");
  } catch {
    return resolvedUrl.startsWith("/api/");
  }
}

const AuthenticatedItemImage: React.FC<AuthenticatedItemImageProps> = ({
  apiBaseUrl,
  imageUrl,
  fallbackSrc,
  cacheBust,
  alt,
  onError,
  ...imgProps
}) => {
  const [src, setSrc] = useState<string>(fallbackSrc);

  useEffect(() => {
    const resolvedUrl = resolveItemImageUrl(apiBaseUrl, imageUrl, cacheBust);
    if (!resolvedUrl) {
      setSrc(fallbackSrc);
      return;
    }

    if (!shouldFetchWithAuth(apiBaseUrl, resolvedUrl)) {
      setSrc(resolvedUrl);
      return;
    }

    const token = readStoredJwt();
    if (!token) {
      setSrc(resolvedUrl);
      return;
    }

    const controller = new AbortController();
    let active = true;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const response = await fetch(resolvedUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Image request failed (${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }

        setSrc(objectUrl);
      } catch {
        if (active) {
          setSrc(fallbackSrc);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [apiBaseUrl, cacheBust, fallbackSrc, imageUrl]);

  return (
    <img
      {...imgProps}
      src={src}
      alt={alt}
      onError={(event) => {
        if (event.currentTarget.src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
};

export default AuthenticatedItemImage;
