import { jwtDecode } from "jwt-decode";
import { readStoredJwt } from "./jwtToken";

type JwtClaims = {
  sub?: string;
  username?: string;
  preferred_username?: string;
  role?: string | string[];
  roles?: string | string[];
  authorities?: string | string[];
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

export function readCurrentUsername(): string {
  const token = readStoredJwt();
  if (!token) return "";

  try {
    const decoded = jwtDecode<JwtClaims>(token);
    return (decoded.sub || decoded.username || decoded.preferred_username || "").trim();
  } catch {
    return "";
  }
}

export function isCurrentUserAdmin(): boolean {
  const token = readStoredJwt();
  if (!token) return false;

  try {
    const decoded = jwtDecode<JwtClaims>(token);
    const username = (decoded.sub || decoded.username || decoded.preferred_username || "")
      .trim()
      .toLowerCase();
    if (username === "admin") return true;

    const roleValues = [
      ...toStringArray(decoded.role),
      ...toStringArray(decoded.roles),
      ...toStringArray(decoded.authorities),
    ].map((role) => role.trim().toLowerCase());

    return roleValues.some((role) => role === "admin" || role === "role_admin");
  } catch {
    return false;
  }
}
