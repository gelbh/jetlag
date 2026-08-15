import { defineString } from "firebase-functions/params";
import { createMemoryCache } from "../lib/memoryCache.mjs";
import { compareAppVersions } from "./sessionVersion.mjs";

export const CLIENT_UPDATE_REQUIRED = "CLIENT_UPDATE_REQUIRED";

export const CLIENT_MIN_VERSION_COLLECTION = "ops";
export const CLIENT_MIN_VERSION_DOC_ID = "clientMinVersion";

/** Short TTL so ops raises propagate without hammering Firestore. */
export const CLIENT_MIN_VERSION_CACHE_TTL_MS = 60_000;

const CACHE_KEY = "clientMinVersion";

export const clientMinVersionParam = defineString("CLIENT_MIN_VERSION", {
  default: "",
});

const minVersionCache = createMemoryCache(CLIENT_MIN_VERSION_CACHE_TTL_MS);

export function clearClientMinVersionCache() {
  minVersionCache.clear();
}

export function meetsClientMinVersion(clientVersion, minVersion) {
  return compareAppVersions(clientVersion, minVersion) >= 0;
}

export function parseClientMinVersionDoc(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  const minVersion = data.minVersion;
  if (typeof minVersion !== "string") {
    return null;
  }
  const trimmed = minVersion.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEnvFallback(envFallback) {
  if (typeof envFallback !== "string") {
    return null;
  }
  const trimmed = envFallback.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve global floor: Firestore `ops/clientMinVersion` first, then
 * `CLIENT_MIN_VERSION` env/param. Null only when both are empty (gate off).
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ envFallback?: string, nowMs?: number }} [options]
 */
export async function resolveClientMinVersion(db, options = {}) {
  const cached = minVersionCache.get(CACHE_KEY);
  if (cached !== undefined) {
    return cached;
  }

  let fromDoc = null;
  try {
    const snap = await db
      .collection(CLIENT_MIN_VERSION_COLLECTION)
      .doc(CLIENT_MIN_VERSION_DOC_ID)
      .get();
    if (snap.exists) {
      fromDoc = parseClientMinVersionDoc(snap.data());
    }
  } catch {
    // Fall through to env — still fail-closed if env is set.
  }

  let envFallback = null;
  if (options.envFallback !== undefined) {
    envFallback = normalizeEnvFallback(options.envFallback);
  } else {
    try {
      envFallback = normalizeEnvFallback(clientMinVersionParam.value());
    } catch {
      envFallback = null;
    }
  }

  const resolved = fromDoc ?? envFallback;
  minVersionCache.set(CACHE_KEY, resolved);
  return resolved;
}

/**
 * Fail-closed when a min is configured; fail-open when min is null/empty.
 *
 * @param {string} clientVersion
 * @param {string | null} minVersion
 */
export function assertClientMeetsGlobalMin(clientVersion, minVersion) {
  if (typeof minVersion !== "string" || !minVersion.trim()) {
    return;
  }
  const min = minVersion.trim();
  const client =
    typeof clientVersion === "string" ? clientVersion.trim() : "";
  if (!client || !meetsClientMinVersion(client, min)) {
    throw new Error(CLIENT_UPDATE_REQUIRED);
  }
}

/**
 * Resolve + assert for join/gated callables.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} clientVersion
 * @param {{ envFallback?: string }} [options]
 */
export async function assertClientMeetsConfiguredMin(db, clientVersion, options) {
  const minVersion = await resolveClientMinVersion(db, options);
  assertClientMeetsGlobalMin(clientVersion, minVersion);
}
