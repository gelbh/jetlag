import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GRANT_ACCESS_ROUTE,
  RATE_LIMITS_COLLECTION,
  clearGrantAccessFailures,
  consumeRateLimit,
  getGrantAccessFailureCount,
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
});
