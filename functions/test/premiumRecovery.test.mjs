import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { premiumSessionCredits } from "../premiumEntitlements.mjs";
import { mergeEntitlementsBetweenUsers } from "../premiumRecovery.mjs";

function createMockDb(initialDocs) {
  const docs = new Map(Object.entries(initialDocs));

  const db = {
    docs,
    runTransaction(callback) {
      const transaction = {
        async get(ref) {
          const data = docs.get(ref.id);
          return {
            data: () => data,
            exists: data != null,
          };
        },
        set(ref, value, options = {}) {
          const existing = docs.get(ref.id) ?? {};
          docs.set(
            ref.id,
            options.merge ? { ...existing, ...value } : { ...value },
          );
        },
      };

      return callback(transaction);
    },
    collection(name) {
      return {
        doc(id) {
          return { id, path: `${name}/${id}` };
        },
      };
    },
  };

  return db;
}

describe("premiumRecovery", () => {
  it("merges premium credits from an anonymous uid to a permanent uid", async () => {
    const db = createMockDb({
      "anon-uid": {
        premiumSessionCredits: 1,
        stripeCustomerId: "cus_test",
      },
      "perm-uid": {},
    });

    const result = await mergeEntitlementsBetweenUsers(
      db,
      "anon-uid",
      "perm-uid",
    );

    assert.equal(result.merged, true);
    assert.equal(premiumSessionCredits(db.docs.get("perm-uid")), 1);
    assert.equal(premiumSessionCredits(db.docs.get("anon-uid")), 0);
  });

  it("skips merge when source uid has no entitlements", async () => {
    const db = createMockDb({
      "anon-uid": {},
      "perm-uid": {},
    });

    const result = await mergeEntitlementsBetweenUsers(
      db,
      "anon-uid",
      "perm-uid",
    );

    assert.equal(result.merged, false);
  });
});
