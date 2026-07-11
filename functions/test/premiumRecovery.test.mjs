import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpsError } from "firebase-functions/v2/https";
import { premiumSessionCredits } from "../premiumEntitlements.mjs";
import {
  listStripeCustomersByEmail,
  mergeEntitlementsBetweenUsers,
  recoverPremiumByStripeEmailHandler,
  requireVerifiedEmailForRecovery,
  VERIFIED_EMAIL_MESSAGE,
} from "../premiumRecovery.mjs";

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
  it("rejects recovery when email is not verified", () => {
    assert.throws(
      () => requireVerifiedEmailForRecovery(false),
      (error) => {
        assert.ok(error instanceof HttpsError);
        assert.equal(error.code, "failed-precondition");
        assert.equal(error.message, VERIFIED_EMAIL_MESSAGE);
        return true;
      },
    );
  });

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

  it("skips merge when source uid was already migrated", async () => {
    const db = createMockDb({
      "anon-uid": {
        premiumSessionCredits: 1,
        migratedToUid: "other-uid",
      },
      "perm-uid": {},
    });

    const result = await mergeEntitlementsBetweenUsers(
      db,
      "anon-uid",
      "perm-uid",
    );

    assert.equal(result.merged, false);
    assert.equal(premiumSessionCredits(db.docs.get("perm-uid")), 0);
  });

  it("paginates stripe customers by email", async () => {
    const calls = [];
    const stripe = {
      customers: {
        list(params) {
          calls.push(params);
          if (!params.starting_after) {
            return Promise.resolve({
              data: [{ id: "cus_1", metadata: { firebaseUid: "a" } }],
              has_more: true,
            });
          }

          return Promise.resolve({
            data: [{ id: "cus_2", metadata: { firebaseUid: "b" } }],
            has_more: false,
          });
        },
      },
    };

    const customers = await listStripeCustomersByEmail(stripe, "user@example.com");

    assert.equal(customers.length, 2);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].starting_after, "cus_1");
  });

  it("recoverPremiumByStripeEmailHandler merges from stripe customer metadata", async () => {
    const db = createMockDb({
      "anon-uid": { premiumSessionCredits: 2 },
      "perm-uid": {},
    });
    const stripe = {
      customers: {
        list() {
          return Promise.resolve({
            data: [
              {
                id: "cus_1",
                metadata: { firebaseUid: "anon-uid" },
              },
            ],
            has_more: false,
          });
        },
      },
    };

    const result = await recoverPremiumByStripeEmailHandler(
      stripe,
      db,
      "perm-uid",
      "user@example.com",
      true,
    );

    assert.equal(result.recovered, true);
    assert.equal(premiumSessionCredits(db.docs.get("perm-uid")), 2);
  });
});
