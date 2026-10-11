import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyStandardWebhook } from "../incident/verifyStandardWebhook.mjs";

const KEY = Buffer.from("0123456789abcdef0123456789abcdef");
const SECRET = `whsec_${KEY.toString("base64")}`;
const NOW_MS = Date.parse("2026-10-11T12:00:00.000Z");
const NOW_S = Math.floor(NOW_MS / 1000);
const BODY = '{"issueId":"iss-1"}';

function sign(id, timestamp, body, key = KEY) {
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

function headers(overrides = {}) {
  return {
    "webhook-id": "msg-1",
    "webhook-timestamp": String(NOW_S),
    "webhook-signature": `v1,${sign("msg-1", NOW_S, BODY)}`,
    ...overrides,
  };
}

test("accepts a valid signature", () => {
  assert.equal(
    verifyStandardWebhook({ secret: SECRET, headers: headers(), rawBody: BODY, nowMs: NOW_MS }),
    true,
  );
});

test("accepts when any of several signatures matches", () => {
  const sig = `v1,${sign("msg-1", NOW_S, BODY, Buffer.from("x".repeat(32)))} v1,${sign("msg-1", NOW_S, BODY)}`;
  assert.equal(
    verifyStandardWebhook({
      secret: SECRET,
      headers: headers({ "webhook-signature": sig }),
      rawBody: BODY,
      nowMs: NOW_MS,
    }),
    true,
  );
});

test("accepts a Buffer raw body", () => {
  assert.equal(
    verifyStandardWebhook({
      secret: SECRET,
      headers: headers(),
      rawBody: Buffer.from(BODY),
      nowMs: NOW_MS,
    }),
    true,
  );
});

test("rejects a tampered body", () => {
  assert.equal(
    verifyStandardWebhook({
      secret: SECRET,
      headers: headers(),
      rawBody: '{"issueId":"iss-2"}',
      nowMs: NOW_MS,
    }),
    false,
  );
});

test("rejects a signature made with another secret", () => {
  const sig = `v1,${sign("msg-1", NOW_S, BODY, Buffer.from("y".repeat(32)))}`;
  assert.equal(
    verifyStandardWebhook({
      secret: SECRET,
      headers: headers({ "webhook-signature": sig }),
      rawBody: BODY,
      nowMs: NOW_MS,
    }),
    false,
  );
});

test("rejects timestamps outside the 5 minute tolerance", () => {
  for (const ts of [NOW_S - 301, NOW_S + 301]) {
    const h = headers({
      "webhook-timestamp": String(ts),
      "webhook-signature": `v1,${sign("msg-1", ts, BODY)}`,
    });
    assert.equal(
      verifyStandardWebhook({ secret: SECRET, headers: h, rawBody: BODY, nowMs: NOW_MS }),
      false,
    );
  }
});

test("rejects missing headers, empty secret, and non-v1 schemes", () => {
  for (const key of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    const h = headers();
    delete h[key];
    assert.equal(
      verifyStandardWebhook({ secret: SECRET, headers: h, rawBody: BODY, nowMs: NOW_MS }),
      false,
    );
  }
  assert.equal(
    verifyStandardWebhook({ secret: "", headers: headers(), rawBody: BODY, nowMs: NOW_MS }),
    false,
  );
  const v2 = headers({ "webhook-signature": `v2,${sign("msg-1", NOW_S, BODY)}` });
  assert.equal(
    verifyStandardWebhook({ secret: SECRET, headers: v2, rawBody: BODY, nowMs: NOW_MS }),
    false,
  );
});
