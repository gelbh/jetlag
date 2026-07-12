import { createHash } from "node:crypto";

export const RATE_LIMITS_COLLECTION = "_rateLimits";
export const GRANT_ACCESS_ROUTE = "grantAccess";

export function rateLimitDocId(route, uid) {
  return createHash("sha256").update(`${route}:${uid}`).digest("hex");
}

function rateLimitDocRef(db, route, uid) {
  return db.collection(RATE_LIMITS_COLLECTION).doc(rateLimitDocId(route, uid));
}

function readCounterFromSnapshot(snapshot, windowMs, nowMs) {
  if (!snapshot.exists) {
    return {
      count: 0,
      windowStartMs: nowMs,
      expiresAt: nowMs + windowMs,
    };
  }

  const data = snapshot.data();
  if (data.expiresAt <= nowMs) {
    return {
      count: 0,
      windowStartMs: nowMs,
      expiresAt: nowMs + windowMs,
    };
  }

  return {
    count: data.count,
    windowStartMs: data.windowStartMs,
    expiresAt: data.expiresAt,
  };
}

export async function consumeRateLimit(
  db,
  { route, uid, limit, windowMs, nowMs = Date.now() },
) {
  const ref = rateLimitDocRef(db, route, uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const state = readCounterFromSnapshot(snapshot, windowMs, nowMs);

    if (state.count >= limit) {
      return {
        allowed: false,
        retryAfterMs: Math.max(0, state.expiresAt - nowMs),
      };
    }

    transaction.set(ref, {
      count: state.count + 1,
      windowStartMs: state.windowStartMs,
      expiresAt: state.expiresAt,
    });

    return { allowed: true };
  });
}

export async function getGrantAccessFailureCount(
  db,
  uid,
  { windowMs, nowMs = Date.now() },
) {
  const snapshot = await rateLimitDocRef(db, GRANT_ACCESS_ROUTE, uid).get();
  return readCounterFromSnapshot(snapshot, windowMs, nowMs).count;
}

export async function recordGrantAccessFailure(
  db,
  uid,
  { maxFailures, windowMs, nowMs = Date.now() },
) {
  const ref = rateLimitDocRef(db, GRANT_ACCESS_ROUTE, uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const state = readCounterFromSnapshot(snapshot, windowMs, nowMs);
    const failures = state.count + 1;

    transaction.set(ref, {
      count: failures,
      windowStartMs: state.windowStartMs,
      expiresAt: state.expiresAt,
    });

    return {
      blocked: failures >= maxFailures,
      failures,
    };
  });
}

export async function clearGrantAccessFailures(db, uid) {
  await rateLimitDocRef(db, GRANT_ACCESS_ROUTE, uid).delete();
}
