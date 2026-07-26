import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  sendProxyAuthFailure,
  verifyOverpassProxyAccess,
  verifyProxyAccess,
} from "../proxies/verifyProxyAccess.mjs";
import {
  consumeRateLimit,
  isFirestoreContentionError,
} from "../lib/firestoreRateLimit.mjs";

export const PROXY_RATE_LIMITS = {
  overpass: {
    free: { limit: 20, windowMs: 60_000 },
    premium: { limit: 60, windowMs: 60_000 },
  },
  transitland: { limit: 30, windowMs: 60_000 },
  vehicles: { limit: 30, windowMs: 60_000 },
};

export function adminAuth() {
  return getAuth();
}

export function adminDb() {
  return getFirestore();
}

function sendRateLimitFailure(res, retryAfterMs) {
  if (retryAfterMs > 0) {
    res.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  }
  res.status(429).json({ error: "Too many requests. Try again later." });
}

function sendContentionFailure(res, route) {
  console.warn(
    JSON.stringify({
      type: "firestore_rate_limit_contention_exhausted",
      route,
    }),
  );
  res.set("Retry-After", "1");
  res.status(503).json({ error: "Temporarily unavailable. Try again." });
}

/**
 * @param {{ set: Function, status: Function, json: Function }} res
 * @param {string} route
 * @param {string} uid
 * @param {string} [tier]
 * @param {{ db?: object, consumeRateLimit?: typeof consumeRateLimit }} [deps]
 */
export async function enforceRateLimit(res, route, uid, tier = "free", deps = {}) {
  const routeLimits = PROXY_RATE_LIMITS[route];
  const limits =
    route === "overpass"
      ? routeLimits[tier] ?? routeLimits.free
      : routeLimits;
  const { limit, windowMs } = limits;
  const db = deps.db ?? adminDb();
  const consume = deps.consumeRateLimit ?? consumeRateLimit;

  let result;
  try {
    result = await consume(db, { route, uid, limit, windowMs });
  } catch (error) {
    // Retries exhausted — soft-fail with log signal instead of Sentry (JETLAG-26).
    if (isFirestoreContentionError(error)) {
      sendContentionFailure(res, route);
      return false;
    }
    throw error;
  }

  if (!result.allowed) {
    sendRateLimitFailure(res, result.retryAfterMs ?? 0);
    return false;
  }

  return true;
}

export async function requireProxyAccess(req, res) {
  const authResult = await verifyProxyAccess(adminAuth(), adminDb(), req);
  if (!authResult.ok) {
    sendProxyAuthFailure(res, authResult);
    return null;
  }

  return authResult;
}

export async function requireOverpassProxyAccess(req, res) {
  const authResult = await verifyOverpassProxyAccess(adminAuth(), adminDb(), req);
  if (!authResult.ok) {
    sendProxyAuthFailure(res, authResult);
    return null;
  }

  return authResult;
}
