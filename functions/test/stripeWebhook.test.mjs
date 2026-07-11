import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleStripeWebhook } from "../stripeWebhook.mjs";

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
});
