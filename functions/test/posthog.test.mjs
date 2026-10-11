import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captureAnalyticsEvent,
  capturePosthogException,
  FUNCTIONS_EXCEPTION_DISTINCT_ID,
  resetFunctionsExceptionClientForTests,
  uuidFromSeed,
} from "../lib/posthog.mjs";

describe("posthog helper", () => {
  it("uuidFromSeed is stable for the same seed", () => {
    assert.equal(uuidFromSeed("evt_1"), uuidFromSeed("evt_1"));
    assert.notEqual(uuidFromSeed("evt_1"), uuidFromSeed("evt_2"));
  });

  it("captureAnalyticsEvent calls capture then shutdown and does not throw on capture failure", async () => {
    const calls = [];
    const captureImpl = {
      capture: (payload) => {
        calls.push(payload);
      },
      shutdown: async () => {
        calls.push("shutdown");
      },
    };
    await captureAnalyticsEvent({
      apiKey: "phc_test",
      distinctId: "uid_1",
      event: "premium_purchase_completed",
      uuidSeed: "evt_abc",
      properties: { productKey: "lifetime", source: "stripe_webhook" },
      captureImpl,
    });
    assert.equal(calls[0].distinctId, "uid_1");
    assert.equal(calls[0].event, "premium_purchase_completed");
    assert.equal(calls[0].uuid, uuidFromSeed("evt_abc"));
    assert.deepEqual(calls[0].properties, {
      productKey: "lifetime",
      source: "stripe_webhook",
    });
    assert.equal(calls.at(-1), "shutdown");

    const bad = {
      capture: () => {
        throw new Error("boom");
      },
      shutdown: async () => {},
    };
    await assert.doesNotReject(() =>
      captureAnalyticsEvent({
        apiKey: "phc_test",
        distinctId: "uid_1",
        event: "x",
        uuidSeed: "e",
        properties: {},
        captureImpl: bad,
      }),
    );

    const asyncReject = {
      capture: () => Promise.reject(new Error("async boom")),
      shutdown: async () => {},
    };
    await assert.doesNotReject(() =>
      captureAnalyticsEvent({
        apiKey: "phc_test",
        distinctId: "uid_1",
        event: "x",
        uuidSeed: "e",
        properties: {},
        captureImpl: asyncReject,
      }),
    );
  });

  it("skips when apiKey or distinctId missing", async () => {
    let called = false;
    const captureImpl = {
      capture: () => {
        called = true;
      },
      shutdown: async () => {},
    };
    await captureAnalyticsEvent({
      apiKey: "",
      distinctId: "uid",
      event: "x",
      uuidSeed: "e",
      properties: {},
      captureImpl,
    });
    assert.equal(called, false);
  });

  it("capturePosthogException uses captureExceptionImmediate when present", async () => {
    resetFunctionsExceptionClientForTests();
    const calls = [];
    await capturePosthogException({
      error: new Error("x"),
      properties: { function_name: "proxy" },
      clientImpl: {
        captureExceptionImmediate: async (error, distinctId, properties) => {
          calls.push({ error, distinctId, properties });
        },
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].distinctId, FUNCTIONS_EXCEPTION_DISTINCT_ID);
    assert.equal(calls[0].properties.function_name, "proxy");
  });

  it("capturePosthogException soft-fails when capture throws", async () => {
    resetFunctionsExceptionClientForTests();
    await assert.doesNotReject(() =>
      capturePosthogException({
        error: new Error("x"),
        clientImpl: {
          captureExceptionImmediate: async () => {
            throw new Error("network");
          },
        },
      }),
    );
  });
});
