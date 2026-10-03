import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { applyCheckoutSessionCompleted } from "../billing/stripeBilling.mjs";
import { handleStripeWebhook } from "../billing/stripeWebhook.mjs";
import { uuidFromSeed } from "../lib/posthog.mjs";

const WEBHOOK_SECRET = "whsec_purchase_analytics";

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

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set() {
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

/**
 * @param {{ id: string; type: string; object: Record<string, unknown> }} params
 */
function signedWebhookRequest({ id, type, object }) {
  const payload = JSON.stringify({
    id,
    object: "event",
    type,
    data: { object },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return {
    method: "POST",
    headers: { "stripe-signature": signature },
    rawBody: Buffer.from(payload),
  };
}

describe("stripe billing purchase analytics", () => {
  it("captures premium_purchase_completed after payment checkout with stripe event id", async () => {
    const db = createMockDb();
    const captureCalls = [];
    const captureImpl = {
      capture: (payload) => {
        captureCalls.push(payload);
      },
      shutdown: async () => {},
    };

    await applyCheckoutSessionCompleted(
      db,
      {
        id: "cs_test_1",
        mode: "payment",
        customer: "cus_1",
        metadata: { firebaseUid: "uid-1", productKey: "pack_1" },
      },
      {
        stripeEventId: "evt_checkout_1",
        posthogApiKey: "phc_test",
        captureImpl,
      },
    );

    assert.equal(db.documents["users/uid-1"]?.premiumSessionCredits, 1);
    assert.equal(captureCalls.length, 1);
    assert.equal(captureCalls[0].distinctId, "uid-1");
    assert.equal(captureCalls[0].event, "premium_purchase_completed");
    assert.equal(captureCalls[0].uuid, uuidFromSeed("premium_purchase_completed:evt_checkout_1"));
    assert.deepEqual(captureCalls[0].properties, {
      productKey: "pack_1",
      source: "stripe_webhook",
    });
  });

  it("skips capture when checkout session has no uid", async () => {
    const db = createMockDb();
    let captureCalls = 0;
    const captureImpl = {
      capture: () => {
        captureCalls += 1;
      },
      shutdown: async () => {},
    };

    await applyCheckoutSessionCompleted(
      db,
      {
        id: "cs_orphan",
        mode: "payment",
        metadata: { productKey: "lifetime" },
      },
      { posthogApiKey: "phc_test", captureImpl },
    );

    assert.equal(captureCalls, 0);
    assert.equal(Object.keys(db.documents).length, 0);
  });

  it("still completes entitlement write when capture throws", async () => {
    const db = createMockDb();
    await assert.doesNotReject(() =>
      applyCheckoutSessionCompleted(
        db,
        {
          id: "cs_lifetime",
          mode: "payment",
          metadata: { firebaseUid: "uid-life", productKey: "lifetime" },
        },
        {
          posthogApiKey: "phc_test",
          captureAnalyticsEvent: async () => {
            throw new Error("posthog down");
          },
        },
      ),
    );
    assert.equal(db.documents["users/uid-life"]?.lifetimePremium, true);
  });

  it("captures on subscription.created when active", async () => {
    const db = createMockDb();
    const res = mockResponse();
    const captureCalls = [];

    await handleStripeWebhook(
      db,
      WEBHOOK_SECRET,
      signedWebhookRequest({
        id: "evt_sub_created",
        type: "customer.subscription.created",
        object: {
          id: "sub_1",
          object: "subscription",
          customer: "cus_sub",
          status: "active",
          current_period_end: 1_700_000_000,
          metadata: { firebaseUid: "uid-sub", plan: "yearly" },
        },
      }),
      res,
      {
        posthogApiKey: "phc_test",
        captureAnalyticsEvent: async (input) => {
          captureCalls.push(input);
        },
      },
    );

    assert.equal(res.statusCode, 200);
    assert.equal(captureCalls.length, 1);
    assert.equal(captureCalls[0].distinctId, "uid-sub");
    assert.equal(captureCalls[0].uuidSeed, "premium_purchase_completed:evt_sub_created");
    assert.deepEqual(captureCalls[0].properties, {
      productKey: "yearly",
      source: "stripe_webhook",
    });
    assert.equal(db.documents["users/uid-sub"]?.subscription?.plan, "yearly");
  });

  it("returns 200 when subscription.created capture throws", async () => {
    const db = createMockDb();
    const res = mockResponse();

    await handleStripeWebhook(
      db,
      WEBHOOK_SECRET,
      signedWebhookRequest({
        id: "evt_sub_capture_fail",
        type: "customer.subscription.created",
        object: {
          id: "sub_fail",
          object: "subscription",
          customer: "cus_sub",
          status: "active",
          current_period_end: 1_700_000_000,
          metadata: { firebaseUid: "uid-capture-fail", plan: "monthly" },
        },
      }),
      res,
      {
        posthogApiKey: "phc_test",
        captureAnalyticsEvent: async () => {
          throw new Error("posthog down");
        },
      },
    );

    assert.equal(res.statusCode, 200);
    assert.equal(db.documents["users/uid-capture-fail"]?.subscription?.plan, "monthly");
  });

  it("does not capture on subscription.created when plan metadata is missing or invalid", async () => {
    for (const plan of [undefined, "lifetime", ""]) {
      const db = createMockDb();
      const res = mockResponse();
      let captureCalls = 0;
      /** @type {Record<string, unknown>} */
      const metadata = { firebaseUid: "uid-no-plan" };
      if (plan !== undefined) {
        metadata.plan = plan;
      }

      await handleStripeWebhook(
        db,
        WEBHOOK_SECRET,
        signedWebhookRequest({
          id: `evt_sub_bad_plan_${String(plan)}`,
          type: "customer.subscription.created",
          object: {
            id: "sub_bad_plan",
            object: "subscription",
            customer: "cus_sub",
            status: "active",
            current_period_end: 1_700_000_000,
            metadata,
          },
        }),
        res,
        {
          posthogApiKey: "phc_test",
          captureAnalyticsEvent: async () => {
            captureCalls += 1;
          },
        },
      );

      assert.equal(res.statusCode, 200);
      assert.equal(captureCalls, 0, `plan=${String(plan)}`);
    }
  });

  it("does not capture on subscription.updated", async () => {
    const db = createMockDb({
      "users/uid-sub": {
        subscription: { status: "active", plan: "monthly" },
      },
    });
    const res = mockResponse();
    let captureCalls = 0;

    await handleStripeWebhook(
      db,
      WEBHOOK_SECRET,
      signedWebhookRequest({
        id: "evt_sub_updated",
        type: "customer.subscription.updated",
        object: {
          id: "sub_1",
          object: "subscription",
          customer: "cus_sub",
          status: "active",
          current_period_end: 1_700_000_000,
          metadata: { firebaseUid: "uid-sub", plan: "monthly" },
        },
      }),
      res,
      {
        posthogApiKey: "phc_test",
        captureAnalyticsEvent: async () => {
          captureCalls += 1;
        },
      },
    );

    assert.equal(res.statusCode, 200);
    assert.equal(captureCalls, 0);
  });
});
