import { compareAppVersions } from "../session/meta/sessionVersion";

/** Firestore path: `ops/clientMinVersion` — global client floor (not peer session version). */
export const CLIENT_MIN_VERSION_COLLECTION = "ops";
export const CLIENT_MIN_VERSION_DOC_ID = "clientMinVersion";

/** Initial production floor when seeding the gate. */
export const INITIAL_CLIENT_MIN_VERSION = "0.11.0";

export function meetsClientMinVersion(
  clientVersion: string,
  minVersion: string,
): boolean {
  return compareAppVersions(clientVersion, minVersion) >= 0;
}

/**
 * True when the client is strictly below a configured min.
 * Empty / missing min means the gate is disabled (fail-open).
 */
export function isBelowClientMinVersion(
  clientVersion: string,
  minVersion: string | null | undefined,
): boolean {
  if (typeof minVersion !== "string") {
    return false;
  }
  const trimmed = minVersion.trim();
  if (!trimmed) {
    return false;
  }
  return compareAppVersions(clientVersion, trimmed) < 0;
}

export function parseClientMinVersionDoc(
  data: unknown,
): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const minVersion = (data as { minVersion?: unknown }).minVersion;
  if (typeof minVersion !== "string") {
    return null;
  }
  const trimmed = minVersion.trim();
  return trimmed.length > 0 ? trimmed : null;
}
