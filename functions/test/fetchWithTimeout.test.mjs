import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchWithTimeout, fetchWithTimeoutAndRetry } from "../lib/fetchWithTimeout.mjs";

describe("fetchWithTimeout", () => {
  it("aborts slow requests", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

    await assert.rejects(
      () => fetchWithTimeout("https://example.com", {}, 10),
      /Aborted/,
    );

    globalThis.fetch = originalFetch;
  });

  it("retries retryable upstream failures", async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      return new Response(null, { status: attempts === 1 ? 502 : 200 });
    };

    const response = await fetchWithTimeoutAndRetry(
      "https://example.com",
      {},
      50,
      1,
    );

    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
    globalThis.fetch = originalFetch;
  });
});
