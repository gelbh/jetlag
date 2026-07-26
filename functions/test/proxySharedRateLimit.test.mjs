import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enforceRateLimit } from "../handlers/proxyShared.mjs";

function createMockResponse() {
  const headers = new Map();
  return {
    statusCode: null,
    body: null,
    headers,
    set(name, value) {
      headers.set(name, value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("enforceRateLimit contention", () => {
  it("returns 503 with replacement log signal when contention retries are exhausted", async () => {
    const res = createMockResponse();
    const warns = [];
    const originalWarn = console.warn;
    console.warn = (...args) => {
      warns.push(args.join(" "));
    };

    try {
      const allowed = await enforceRateLimit(res, "overpass", "uid-1", "free", {
        db: {},
        consumeRateLimit: async () => {
          const error = new Error(
            "10 ABORTED: Too much contention on these documents. Please try again.",
          );
          error.code = 10;
          throw error;
        },
      });

      assert.equal(allowed, false);
      assert.equal(res.statusCode, 503);
      assert.equal(res.headers.get("Retry-After"), "1");
      assert.deepEqual(res.body, { error: "Temporarily unavailable. Try again." });
      assert.equal(warns.length, 1);
      assert.match(warns[0], /firestore_rate_limit_contention_exhausted/);
      assert.match(warns[0], /"route":"overpass"/);
    } finally {
      console.warn = originalWarn;
    }
  });

  it("rethrows unexpected rate-limit errors", async () => {
    const res = createMockResponse();

    await assert.rejects(
      () =>
        enforceRateLimit(res, "overpass", "uid-1", "free", {
          db: {},
          consumeRateLimit: async () => {
            throw new Error("boom");
          },
        }),
      /boom/,
    );
    assert.equal(res.statusCode, null);
  });
});
