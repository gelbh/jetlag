import { createHash } from "node:crypto";

export const RATE_LIMITS_COLLECTION = "_rateLimits";
export const GRANT_ACCESS_ROUTE = "grantAccess";

/** Outer retries after Firestore's own transaction maxAttempts are exhausted. */
export const RATE_LIMIT_CONTENTION_MAX_ATTEMPTS = 4;
const CONTENTION_BASE_DELAY_MS = 25;

export function rateLimitDocId(route, uid) {
  return createHash("sha256").update(`${route}:${uid}`).digest("hex");
}

function rateLimitDocRef(db, route, uid) {
  return db.collection(RATE_LIMITS_COLLECTION).doc(rateLimitDocId(route, uid));
}

/**
 * Firestore transaction contention (gRPC 10 ABORTED).
 * @param {unknown} error
 * @returns {boolean}
 */
export function isFirestoreContentionError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = /** @type {{ code?: unknown }} */ (error).code;
  if (code === 10 || code === "ABORTED" || code === "aborted") {
    return true;
  }

  const message =
    typeof /** @type {{ message?: unknown }} */ (error).message === "string"
      ? /** @type {{ message: string }} */ (error).message
      : "";
  return (
    /Too much contention on these documents/i.test(message) ||
    /\b10\s+ABORTED\b/i.test(message)
  );
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{
 *   route: string,
 *   maxAttempts?: number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} options
 * @returns {Promise<T>}
 */
async function runWithContentionRetry(operation, options) {
  const maxAttempts = options.maxAttempts ?? RATE_LIMIT_CONTENTION_MAX_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isFirestoreContentionError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const delayMs = CONTENTION_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.log(
        JSON.stringify({
          type: "firestore_rate_limit_contention",
          route: options.route,
          attempt,
          maxAttempts,
          delayMs,
        }),
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
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
  {
    route,
    uid,
    limit,
    windowMs,
    nowMs = Date.now(),
    maxAttempts = RATE_LIMIT_CONTENTION_MAX_ATTEMPTS,
    sleep = defaultSleep,
  },
) {
  const ref = rateLimitDocRef(db, route, uid);

  return runWithContentionRetry(
    () =>
      db.runTransaction(async (transaction) => {
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
      }),
    { route, maxAttempts, sleep },
  );
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
