import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GRANT_ACCESS_ROUTE,
  RATE_LIMITS_COLLECTION,
  clearGrantAccessFailures,
  consumeRateLimit,
  getGrantAccessFailureCount,
  isFirestoreContentionError,
  rateLimitDocId,
  recordGrantAccessFailure,
} from "../lib/firestoreRateLimit.mjs";

function createInMemoryFirestore() {
  const documents = new Map();

  function docPath(collection, id) {
    return `${collection}/${id}`;
  }

  function createDocRef(collection, id) {
    const path = docPath(collection, id);
    return {
      path,
      get: async () => {
        const data = documents.get(path);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set: async (data) => {
        documents.set(path, { ...data });
      },
      delete: async () => {
        documents.delete(path);
      },
    };
  }

  return {
    documents,
    collection(name) {
      return {
        doc(id) {
          return createDocRef(name, id);
        },
      };
    },
    async runTransaction(callback) {
      const pendingWrites = new Map();

      const transaction = {
        async get(ref) {
          const pending = pendingWrites.get(ref.path);
          if (pending === "delete") {
            return { exists: false, data: () => undefined };
          }
          if (pending) {
            return { exists: true, data: () => pending };
          }
          const data = documents.get(ref.path);
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        set(ref, data) {
          pendingWrites.set(ref.path, { ...data });
        },
      };

      const result = await callback(transaction);

      for (const [path, value] of pendingWrites.entries()) {
        if (value === "delete") {
          documents.delete(path);
        } else {
          documents.set(path, value);
        }
      }

      return result;
    },
  };
}

describe("firestoreRateLimit", () => {
  it("builds stable doc ids for route and uid", () => {
    const first = rateLimitDocId("overpass", "uid-a");
    const second = rateLimitDocId("overpass", "uid-a");
    const third = rateLimitDocId("vehicles", "uid-a");

    assert.equal(first, second);
    assert.notEqual(first, third);
  });

  it("allows requests under the limit", async () => {
    const db = createInMemoryFirestore();
    const options = {
      route: "overpass",
      uid: "user-1",
      limit: 3,
      windowMs: 60_000,
      nowMs: 1_000,
    };

    assert.deepEqual(await consumeRateLimit(db, options), { allowed: true });
    assert.deepEqual(await consumeRateLimit(db, options), { allowed: true });
    assert.deepEqual(await consumeRateLimit(db, options), { allowed: true });
  });

  it("denies requests at the limit and returns retryAfterMs", async () => {
    const db = createInMemoryFirestore();
    const options = {
      route: "vehicles",
      uid: "user-2",
      limit: 2,
      windowMs: 60_000,
      nowMs: 5_000,
    };

    await consumeRateLimit(db, options);
    await consumeRateLimit(db, options);

    const denied = await consumeRateLimit(db, options);
    assert.equal(denied.allowed, false);
    assert.equal(denied.retryAfterMs, 60_000);
  });

  it("resets the window after expiry", async () => {
    const db = createInMemoryFirestore();
    const uid = "user-3";
    const route = "transitland";

    await consumeRateLimit(db, {
      route,
      uid,
      limit: 1,
      windowMs: 1_000,
      nowMs: 0,
    });

    const denied = await consumeRateLimit(db, {
      route,
      uid,
      limit: 1,
      windowMs: 1_000,
      nowMs: 500,
    });
    assert.equal(denied.allowed, false);

    const allowed = await consumeRateLimit(db, {
      route,
      uid,
      limit: 1,
      windowMs: 1_000,
      nowMs: 1_001,
    });
    assert.equal(allowed.allowed, true);
  });

  it("tracks grantAccess failures and clears on success", async () => {
    const db = createInMemoryFirestore();
    const uid = "user-4";
    const options = {
      maxFailures: 3,
      windowMs: 900_000,
      nowMs: 10_000,
    };

    assert.equal(await getGrantAccessFailureCount(db, uid, options), 0);

    const first = await recordGrantAccessFailure(db, uid, options);
    assert.deepEqual(first, { blocked: false, failures: 1 });

    const second = await recordGrantAccessFailure(db, uid, options);
    assert.deepEqual(second, { blocked: false, failures: 2 });

    const third = await recordGrantAccessFailure(db, uid, options);
    assert.deepEqual(third, { blocked: true, failures: 3 });

    assert.equal(await getGrantAccessFailureCount(db, uid, options), 3);

    await clearGrantAccessFailures(db, uid);
    assert.equal(await getGrantAccessFailureCount(db, uid, options), 0);
  });

  it("stores counters in the rate limits collection", async () => {
    const db = createInMemoryFirestore();
    const uid = "user-5";

    await consumeRateLimit(db, {
      route: "overpass",
      uid,
      limit: 5,
      windowMs: 60_000,
      nowMs: 2_000,
    });

    const path = `${RATE_LIMITS_COLLECTION}/${rateLimitDocId("overpass", uid)}`;
    assert.equal(db.documents.has(path), true);

    const grantPath = `${RATE_LIMITS_COLLECTION}/${rateLimitDocId(GRANT_ACCESS_ROUTE, uid)}`;
    await recordGrantAccessFailure(db, uid, {
      maxFailures: 8,
      windowMs: 900_000,
      nowMs: 2_000,
    });
    assert.equal(db.documents.has(grantPath), true);
  });

  it("detects Firestore ABORTED contention errors", () => {
    assert.equal(
      isFirestoreContentionError({
        code: 10,
        message: "10 ABORTED: Too much contention on these documents. Please try again.",
      }),
      true,
    );
    assert.equal(isFirestoreContentionError({ code: "ABORTED", message: "aborted" }), true);
    assert.equal(
      isFirestoreContentionError({
        message: "Too much contention on these documents. Please try again.",
      }),
      true,
    );
    assert.equal(isFirestoreContentionError({ code: 14, message: "UNAVAILABLE" }), false);
    assert.equal(isFirestoreContentionError(null), false);
  });

  it("retries consumeRateLimit after transient ABORTED contention", async () => {
    const db = createInMemoryFirestore();
    let attempts = 0;
    const originalRunTransaction = db.runTransaction.bind(db);
    db.runTransaction = async (callback) => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error(
          "10 ABORTED: Too much contention on these documents. Please try again.",
        );
        error.code = 10;
        throw error;
      }
      return originalRunTransaction(callback);
    };

    const delays = [];
    const result = await consumeRateLimit(db, {
      route: "overpass",
      uid: "user-contention",
      limit: 5,
      windowMs: 60_000,
      nowMs: 1_000,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });

    assert.deepEqual(result, { allowed: true });
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [25, 50]);
  });

  it("rethrows when ABORTED contention retries are exhausted", async () => {
    const db = createInMemoryFirestore();
    db.runTransaction = async () => {
      const error = new Error(
        "10 ABORTED: Too much contention on these documents. Please try again.",
      );
      error.code = 10;
      throw error;
    };

    await assert.rejects(
      () =>
        consumeRateLimit(db, {
          route: "overpass",
          uid: "user-exhausted",
          limit: 5,
          windowMs: 60_000,
          maxAttempts: 2,
          sleep: async () => {},
        }),
      (error) => isFirestoreContentionError(error),
    );
  });

  it("does not retry non-contention Firestore errors", async () => {
    const db = createInMemoryFirestore();
    let attempts = 0;
    db.runTransaction = async () => {
      attempts += 1;
      const error = new Error("14 UNAVAILABLE: upstream");
      error.code = 14;
      throw error;
    };

    await assert.rejects(
      () =>
        consumeRateLimit(db, {
          route: "overpass",
          uid: "user-unavailable",
          limit: 5,
          windowMs: 60_000,
          sleep: async () => {
            assert.fail("should not sleep for non-contention errors");
          },
        }),
      /UNAVAILABLE/,
    );
    assert.equal(attempts, 1);
  });
});
