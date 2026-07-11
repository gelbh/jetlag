import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  sendProxyAuthFailure,
  verifyOverpassProxyAccess,
  verifyProxyAccess,
} from "../verifyProxyAccess.mjs";
import { consumeRateLimit } from "../firestoreRateLimit.mjs";

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

export async function enforceRateLimit(res, route, uid, tier = "free") {
  const routeLimits = PROXY_RATE_LIMITS[route];
  const limits =
    route === "overpass"
      ? routeLimits[tier] ?? routeLimits.free
      : routeLimits;
  const { limit, windowMs } = limits;
  const result = await consumeRateLimit(adminDb(), { route, uid, limit, windowMs });
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
