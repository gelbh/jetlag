import {
  isValidSessionCode,
  normalizeSessionCode,
} from "./sessionCodes";

/** Normalize/validate a raw invite or query code. Null when invalid. */
export function parseSessionInviteCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) {
    return null;
  }
  const letters = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (letters.length !== 4) {
    return null;
  }
  const normalized = normalizeSessionCode(raw);
  return isValidSessionCode(normalized) ? normalized : null;
}

/**
 * Prefer the current browser origin for shareable invites, but fall back to the
 * public site origin for Capacitor/WebView hosts (localhost / non-http schemes).
 */
export function resolveSessionInviteOrigin(
  currentOrigin: string,
  publicOrigin: string,
): string {
  try {
    const url = new URL(currentOrigin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return publicOrigin;
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      /^127(?:\.\d{1,3}){3}$/.test(host) ||
      host === "::1" ||
      host === "[::1]"
    ) {
      return publicOrigin;
    }
    return currentOrigin.replace(/\/+$/, "");
  } catch {
    return publicOrigin;
  }
}

/** Absolute `/join?code=` URL for remote session invites. Null when code is invalid. */
export function buildSessionInviteUrl(
  origin: string,
  code: string,
): string | null {
  const normalized = parseSessionInviteCode(code);
  if (!normalized) {
    return null;
  }

  const base = origin.replace(/\/+$/, "");
  return `${base}/join?code=${encodeURIComponent(normalized)}`;
}
