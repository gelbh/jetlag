import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { handleStripeWebhook } from "../billing/stripeWebhook.mjs";

const WEBHOOK_SECRET = "whsec_test_secret";

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    set(name, value) {
      this.headers[name] = value;
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
  return res;
}

/**
 * @param {Record<string, Record<string, unknown>>} [initialData]
 */
function createWebhookMockDb(initialData = {}) {
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
                const next = { ...(options?.merge ? documents[path] : {}), ...data };
                for (const [key, value] of Object.entries(next)) {
                  if (value === FieldValue.delete()) {
                    delete next[key];
                  }
                }
                documents[path] = next;
              }
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
    writes,
    documents,
  };

  return db;
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

describe("stripeWebhook", () => {
  it("rejects non-POST requests", async () => {
    const res = mockResponse();
    await handleStripeWebhook({}, "whsec_test", { method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 405);
  });

  it("rejects requests without a Stripe signature", async () => {
    const res = mockResponse();
    await handleStripeWebhook(
      {},
      "whsec_test",
      { method: "POST", headers: {}, rawBody: Buffer.from("{}") },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body, "Missing Stripe signature");
  });

  it("returns 503 when webhook secret is missing", async () => {
    const res = mockResponse();
    await handleStripeWebhook(
      {},
      "",
      {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        rawBody: Buffer.from("{}"),
      },
      res,
    );
    assert.equal(res.statusCode, 503);
  });

  it("returns 400 when signature verification fails", async () => {
    const res = mockResponse();
    await handleStripeWebhook(
      {},
      "whsec_test",
      {
        method: "POST",
        headers: { "stripe-signature": "invalid" },
        rawBody: Buffer.from("{}"),
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body, "Webhook signature verification failed");
  });

  it("clears stripeCustomerId from metadata.firebaseUid on customer.deleted", async () => {
    const db = createWebhookMockDb({
      "users/host-1": {
        stripeCustomerId: "cus_deleted",
        subscription: { status: "active", plan: "monthly" },
      },
    });
    const res = mockResponse();

    await handleStripeWebhook(
      db,
      WEBHOOK_SECRET,
      signedWebhookRequest({
        id: "evt_customer_deleted_meta",
        type: "customer.deleted",
        object: {
          id: "cus_deleted",
          object: "customer",
          metadata: { firebaseUid: "host-1" },
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, undefined);
    assert.deepEqual(db.documents["users/host-1"]?.subscription, {
      status: "active",
      plan: "monthly",
    });
  });

  it("clears stripeCustomerId via Firestore query when metadata is absent", async () => {
    const db = createWebhookMockDb({
      "users/host-2": {
        stripeCustomerId: "cus_query_match",
        subscription: { status: "trialing", plan: "yearly" },
      },
    });
    const res = mockResponse();

    await handleStripeWebhook(
      db,
      WEBHOOK_SECRET,
      signedWebhookRequest({
        id: "evt_customer_deleted_query",
        type: "customer.deleted",
        object: {
          id: "cus_query_match",
          object: "customer",
          metadata: {},
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
    assert.equal(db.documents["users/host-2"]?.stripeCustomerId, undefined);
    assert.deepEqual(db.documents["users/host-2"]?.subscription, {
      status: "trialing",
      plan: "yearly",
    });
  });

  it("returns 200 when customer.deleted has no matching user", async () => {
    const db = createWebhookMockDb();
    const res = mockResponse();

    await handleStripeWebhook(
      db,
      WEBHOOK_SECRET,
      signedWebhookRequest({
        id: "evt_customer_deleted_orphan",
        type: "customer.deleted",
        object: {
          id: "cus_orphan",
          object: "customer",
          metadata: {},
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
    assert.equal(db.writes.filter((write) => write.path.startsWith("users/")).length, 0);
  });

  it("short-circuits duplicate customer.deleted events without a second write", async () => {
    const db = createWebhookMockDb({
      "users/host-1": {
        stripeCustomerId: "cus_deleted",
        subscription: { status: "active", plan: "monthly" },
      },
    });
    const request = signedWebhookRequest({
      id: "evt_customer_deleted_dup",
      type: "customer.deleted",
      object: {
        id: "cus_deleted",
        object: "customer",
        metadata: { firebaseUid: "host-1" },
      },
    });

    const first = mockResponse();
    await handleStripeWebhook(db, WEBHOOK_SECRET, request, first);
    assert.equal(first.statusCode, 200);
    assert.deepEqual(first.body, { received: true });
    assert.equal(db.documents["users/host-1"]?.stripeCustomerId, undefined);

    const userWritesAfterFirst = db.writes.filter((write) => write.path === "users/host-1").length;

    const second = mockResponse();
    await handleStripeWebhook(db, WEBHOOK_SECRET, request, second);
    assert.equal(second.statusCode, 200);
    assert.deepEqual(second.body, { received: true, duplicate: true });
    assert.equal(
      db.writes.filter((write) => write.path === "users/host-1").length,
      userWritesAfterFirst,
    );
  });
});
