import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  clearStripeCustomerIdForDeletedCustomer,
  createBillingPortalSessionHandler,
  createCheckoutSessionHandler,
  ensureStripeCustomer,
  isStaleStripeCustomerError,
  mapStripeBillingError,
  syncSubscriptionEntitlements,
} from "../billing/stripeBilling.mjs";

function staleCustomerError() {
  const error = new Error(
    "No such customer: 'cus_test'; a similar object exists in test mode, but a live mode key was used to make this request.",
  );
  error.type = "StripeInvalidRequestError";
  error.code = "resource_missing";
  return error;
}

function applyMockWrite(documents, writes, path, data, options) {
  writes.push({ path, data });
  if (options?.merge && documents[path]) {
    const merged = { ...documents[path] };
    for (const [key, value] of Object.entries(data)) {
      if (value === FieldValue.delete()) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }
    documents[path] = merged;
  } else {
    const next = { ...(options?.merge ? documents[path] : {}), ...data };
    for (const [key, value] of Object.entries(next)) {
      if (value === FieldValue.delete()) {
        delete next[key];
      }
    }
    documents[path] = next;
  }
}

function createMockDb(initialData = {}) {
  /** @type {Record<string, Record<string, unknown>>} */
  const documents = { ...initialData };
  /** @type {Array<{ path: string; data: Record<string, unknown> }>} */
  const writes = [];

  const db = {
    collection(name) {
      return {
        doc(id) {
          const path = `${name}/${id}`;
          return {
            id,
            path,
            async get() {
              const data = documents[path];
              return {
                exists: data !== undefined,
                data: () => data,
              };
            },
            set(data, options) {
              applyMockWrite(documents, writes, path, data, options);
              return Promise.resolve();
            },
          };
        },
        where(field, op, value) {
          assert.equal(op, "==");
          const chain = {
            limit() {
              return chain;
            },
            async get() {
              const docs = Object.entries(documents)
                .filter(([path, data]) => {
                  if (!path.startsWith(`${name}/`)) {
                    return false;
                  }
                  return data?.[field] === value;
                })
                .map(([path, data]) => {
                  const id = path.slice(name.length + 1);
                  return {
                    id,
                    data: () => data,
                  };
                });
              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };
          return chain;
        },
      };
    },
    async runTransaction(callback) {
      const transaction = {
        async get(ref) {
          const path = ref.path;
          const data = documents[path];
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        set(ref, data, options) {
          applyMockWrite(documents, writes, ref.path, data, options);
        },
      };
      return callback(transaction);
    },
    writes,
    documents,
  };

  return db;
}

function createMockStripe(overrides = {}) {
  return {
    customers: {
      retrieve: overrides.retrieve ?? (async (customerId) => ({ id: customerId })),
      create: overrides.create ?? (async () => ({ id: "cus_live_new" })),
      search:
        overrides.search ??
        (async () => ({
          data: [],
        })),
    },
    checkout: {
      sessions: {
        create:
          overrides.checkoutCreate ??
          (async () => ({ url: "https://checkout.stripe.test/session" })),
      },
    },
    billingPortal: {
      sessions: {
        create:
          overrides.portalCreate ?? (async () => ({ url: "https://billing.stripe.test/portal" })),
      },
    },
  };
}

describe("stripeBilling", () => {
  it("detects stale Stripe customer errors", () => {
    assert.equal(isStaleStripeCustomerError(staleCustomerError()), true);
    assert.equal(
      isStaleStripeCustomerError({
        type: "StripeInvalidRequestError",
        code: "resource_missing",
        message: "No such customer: 'cus_x'",
        param: "customer",
      }),
      true,
    );
    assert.equal(
      isStaleStripeCustomerError({
        type: "StripeInvalidRequestError",
        code: "resource_missing",
      }),
      false,
    );
    assert.equal(isStaleStripeCustomerError(new Error("network down")), false);
  });

  it("maps Stripe errors to friendly billing messages", () => {
    const checkoutError = mapStripeBillingError(new Error("stripe down"), "checkout");
    assert.ok(checkoutError instanceof HttpsError);
    assert.equal(checkoutError.code, "failed-precondition");
    assert.equal(checkoutError.message, "Couldn't start checkout. Try again.");

    const portalError = mapStripeBillingError(new Error("stripe down"), "portal");
    assert.equal(portalError.message, "Couldn't open billing portal. Try again.");
  });

  it("reuses a valid existing Stripe customer", async () => {
    const db = createMockDb({
      "users/host-1": { stripeCustomerId: "cus_live_existing" },
    });
    const stripe = createMockStripe();
    let created = false;
    stripe.customers.create = async () => {
      created = true;
      return { id: "cus_should_not_create" };
    };

    const customerId = await ensureStripeCustomer(stripe, db, "host-1", "host@example.com");

    assert.equal(customerId, "cus_live_existing");
    assert.equal(created, false);
  });

  it("replaces a stale Stripe customer and updates Firestore", async () => {
    const db = createMockDb({
      "users/host-1": {
        stripeCustomerId: "cus_test_stale",
        subscription: { status: "active", plan: "monthly" },
      },
    });
    const stripe = createMockStripe({
      retrieve: async () => {
        throw staleCustomerError();
      },
      create: async () => ({ id: "cus_live_replacement" }),
    });

    const customerId = await ensureStripeCustomer(stripe, db, "host-1", "host@example.com");

    assert.equal(customerId, "cus_live_replacement");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_live_replacement");
    assert.equal(db.documents["users/host-1"]?.subscription, undefined);
  });

  it("replaces a deleted Stripe customer and updates Firestore", async () => {
    const db = createMockDb({
      "users/host-1": {
        stripeCustomerId: "cus_deleted",
        subscription: { status: "active", plan: "monthly" },
      },
    });
    const stripe = createMockStripe({
      retrieve: async () => ({ id: "cus_deleted", deleted: true }),
      create: async () => ({ id: "cus_live_replacement" }),
    });

    const customerId = await ensureStripeCustomer(stripe, db, "host-1", "host@example.com");

    assert.equal(customerId, "cus_live_replacement");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_live_replacement");
    assert.equal(db.documents["users/host-1"]?.subscription, undefined);
  });

  it("starts checkout after replacing a stale customer", async () => {
    process.env.STRIPE_PRICE_PACK_1 = "price_test_pack_1";
    const db = createMockDb({
      "users/host-1": { stripeCustomerId: "cus_test_stale" },
    });
    const stripe = createMockStripe({
      retrieve: async () => {
        throw staleCustomerError();
      },
      create: async () => ({ id: "cus_live_replacement" }),
    });

    const result = await createCheckoutSessionHandler(
      stripe,
      db,
      "host-1",
      "host@example.com",
      "pack_1",
    );

    assert.equal(result.url, "https://checkout.stripe.test/session");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_live_replacement");
  });

  it("starts checkout after replacing a deleted customer", async () => {
    process.env.STRIPE_PRICE_PACK_1 = "price_test_pack_1";
    const db = createMockDb({
      "users/host-1": { stripeCustomerId: "cus_deleted" },
    });
    const stripe = createMockStripe({
      retrieve: async () => ({ id: "cus_deleted", deleted: true }),
      create: async () => ({ id: "cus_live_replacement" }),
    });

    const result = await createCheckoutSessionHandler(
      stripe,
      db,
      "host-1",
      "host@example.com",
      "pack_1",
    );

    assert.equal(result.url, "https://checkout.stripe.test/session");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_live_replacement");
  });

  it("maps checkout failures to a friendly message", async () => {
    process.env.STRIPE_PRICE_PACK_1 = "price_test_pack_1";
    const db = createMockDb({
      "users/host-1": { stripeCustomerId: "cus_live_existing" },
    });
    const stripe = createMockStripe({
      checkoutCreate: async () => {
        throw new Error("price inactive");
      },
    });

    await assert.rejects(
      () => createCheckoutSessionHandler(stripe, db, "host-1", "host@example.com", "pack_1"),
      (error) => {
        assert.ok(error instanceof HttpsError);
        assert.equal(error.code, "failed-precondition");
        assert.equal(error.message, "Couldn't start checkout. Try again.");
        return true;
      },
    );
  });

  it("opens the billing portal through the healed customer path", async () => {
    const db = createMockDb({
      "users/host-1": { stripeCustomerId: "cus_test_stale" },
    });
    const stripe = createMockStripe({
      retrieve: async () => {
        throw staleCustomerError();
      },
      create: async () => ({ id: "cus_live_replacement" }),
    });

    const result = await createBillingPortalSessionHandler(
      stripe,
      db,
      "host-1",
      "host@example.com",
    );

    assert.equal(result.url, "https://billing.stripe.test/portal");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_live_replacement");
  });

  it("reuses a searched Stripe customer when Firestore has no customer id", async () => {
    const db = createMockDb({
      "users/host-1": {
        subscription: { status: "active", plan: "monthly" },
      },
    });
    let created = false;
    let searchQuery = "";
    const stripe = createMockStripe({
      search: async ({ query }) => {
        searchQuery = query;
        return {
          data: [{ id: "cus_search_hit", metadata: { firebaseUid: "host-1" } }],
        };
      },
      create: async () => {
        created = true;
        return { id: "cus_should_not_create" };
      },
    });

    const customerId = await ensureStripeCustomer(stripe, db, "host-1", "host@example.com");

    assert.equal(customerId, "cus_search_hit");
    assert.equal(created, false);
    assert.equal(searchQuery, "metadata['firebaseUid']:'host-1'");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_search_hit");
    assert.deepEqual(db.documents["users/host-1"]?.subscription, {
      status: "active",
      plan: "monthly",
    });
  });

  it("clears subscription when search reuses a customer after a deleted stored id", async () => {
    const db = createMockDb({
      "users/host-1": {
        stripeCustomerId: "cus_deleted",
        subscription: { status: "active", plan: "monthly", stripeSubscriptionId: "sub_old" },
      },
    });
    const stripe = createMockStripe({
      retrieve: async () => ({ id: "cus_deleted", deleted: true }),
      search: async () => ({
        data: [{ id: "cus_search_orphan", metadata: { firebaseUid: "host-1" } }],
      }),
      create: async () => ({ id: "cus_should_not_create" }),
    });

    const customerId = await ensureStripeCustomer(stripe, db, "host-1", "host@example.com");

    assert.equal(customerId, "cus_search_orphan");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_search_orphan");
    assert.equal(db.documents["users/host-1"]?.subscription, undefined);
  });

  it("creates a Stripe customer when search returns no live match", async () => {
    const db = createMockDb({
      "users/host-1": {},
    });
    const stripe = createMockStripe({
      search: async () => ({
        data: [{ id: "cus_deleted_orphan", deleted: true }],
      }),
      create: async () => ({ id: "cus_created_after_miss" }),
    });

    const customerId = await ensureStripeCustomer(stripe, db, "host-1", "host@example.com");

    assert.equal(customerId, "cus_created_after_miss");
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_created_after_miss");
  });

  it("clears matching stripeCustomerId transactionally and skips newer ids", async () => {
    const db = createMockDb({
      "users/host-1": { stripeCustomerId: "cus_old" },
      "users/host-2": { stripeCustomerId: "cus_old" },
      "users/host-3": { stripeCustomerId: "cus_new" },
    });

    await clearStripeCustomerIdForDeletedCustomer(db, {
      id: "cus_old",
      metadata: {},
    });

    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, undefined);
    assert.equal(db.documents["users/host-2"]?.stripeCustomerId, undefined);
    assert.equal(db.documents["users/host-3"]?.stripeCustomerId, "cus_new");
  });

  it("does not write when clearing an already-absent stripeCustomerId", async () => {
    const db = createMockDb({
      "users/ghost": { premiumSessionCredits: 1 },
    });

    await clearStripeCustomerIdForDeletedCustomer(db, {
      id: "cus_missing",
      metadata: { firebaseUid: "ghost" },
    });

    assert.equal(db.writes.filter((write) => write.path === "users/ghost").length, 0);
    assert.deepEqual(db.documents["users/ghost"], { premiumSessionCredits: 1 });
  });

  it("omits stripeCustomerId when syncing a canceled subscription", async () => {
    const db = createMockDb({
      "users/host-1": {},
    });

    await syncSubscriptionEntitlements(db, {
      id: "sub_canceled",
      status: "canceled",
      customer: "cus_deleted",
      current_period_end: 1_700_000_000,
      metadata: { firebaseUid: "host-1", plan: "monthly" },
    });

    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, undefined);
    assert.equal(db.documents["users/host-1"]?.subscription?.status, "canceled");
    assert.equal(db.documents["users/host-1"]?.subscription?.stripeSubscriptionId, "sub_canceled");
  });

  it("writes stripeCustomerId when syncing an active subscription", async () => {
    const db = createMockDb({
      "users/host-1": {},
    });

    await syncSubscriptionEntitlements(db, {
      id: "sub_active",
      status: "active",
      customer: "cus_live",
      current_period_end: 1_700_000_000,
      metadata: { firebaseUid: "host-1", plan: "yearly" },
    });

    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, "cus_live");
    assert.equal(db.documents["users/host-1"]?.subscription?.status, "active");
  });
});
