import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  createBillingPortalSessionHandler,
  createCheckoutSessionHandler,
  ensureStripeCustomer,
  isStaleStripeCustomerError,
  mapStripeBillingError,
} from "../stripeBilling.mjs";

function staleCustomerError() {
  const error = new Error(
    "No such customer: 'cus_test'; a similar object exists in test mode, but a live mode key was used to make this request.",
  );
  error.type = "StripeInvalidRequestError";
  error.code = "resource_missing";
  return error;
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
            async get() {
              const data = documents[path];
              return {
                exists: data !== undefined,
                data: () => data,
              };
            },
            set(data, options) {
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
                documents[path] = data;
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
    writes,
    documents,
  };

  return db;
}

function createMockStripe(overrides = {}) {
  return {
    customers: {
      retrieve:
        overrides.retrieve ??
        (async (customerId) => ({ id: customerId })),
      create:
        overrides.create ??
        (async () => ({ id: "cus_live_new" })),
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
          overrides.portalCreate ??
          (async () => ({ url: "https://billing.stripe.test/portal" })),
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

    const customerId = await ensureStripeCustomer(
      stripe,
      db,
      "host-1",
      "host@example.com",
    );

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

    const customerId = await ensureStripeCustomer(
      stripe,
      db,
      "host-1",
      "host@example.com",
    );

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
      () =>
        createCheckoutSessionHandler(
          stripe,
          db,
          "host-1",
          "host@example.com",
          "pack_1",
        ),
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
});
