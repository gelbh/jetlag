import {
  isValidSessionCode,
  normalizeSessionCode,
} from "../../../services/session/sessionCodes";

/** Absolute `/join?code=` URL for remote session invites. Null when code is invalid. */
export function buildSessionInviteUrl(
  origin: string,
  code: string,
): string | null {
  const normalized = normalizeSessionCode(code);
  if (!isValidSessionCode(normalized)) {
    return null;
  }

  const base = origin.replace(/\/+$/, "");
  return `${base}/join?code=${encodeURIComponent(normalized)}`;
}
