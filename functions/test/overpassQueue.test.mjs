import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearOverpassQueueForTests,
  enqueueOverpassFetch,
} from "../proxies/overpassQueue.mjs";

describe("overpassQueue", () => {
  it("runs premium requests before free backlog", async () => {
    clearOverpassQueueForTests();
    const order = [];
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    const firstPending = enqueueOverpassFetch("free", async () => {
      order.push("active-free");
      await firstGate;
      return "first";
    });
    const freePending = enqueueOverpassFetch("free", async () => {
      order.push("queued-free");
      return "free-result";
    });
    const premiumPending = enqueueOverpassFetch("premium", async () => {
      order.push("queued-premium");
      return "premium-result";
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    assert.deepEqual(order, ["active-free"]);

    releaseFirst();
    await Promise.all([firstPending, freePending, premiumPending]);

    assert.deepEqual(order, [
      "active-free",
      "queued-premium",
      "queued-free",
    ]);
  });
});
