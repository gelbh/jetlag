import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  fetchOverpassWithFailover,
  isTimeoutLikeOverpassStatus,
  toOverpassUpstreamError,
} from "../proxies/overpassProxyCore.mjs";
import { OVERPASS_ENDPOINTS } from "../proxies/overpassEndpoints.mjs";

function abortError() {
  const error = new Error("This operation was aborted");
  error.name = "AbortError";
  return error;
}

function jsonResponse(status, body = "{}") {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("overpassFailover helpers", () => {
  it("maps AbortError to Overpass timed out.", () => {
    const mapped = toOverpassUpstreamError(abortError());
    assert.equal(mapped.message, "Overpass timed out.");
    assert.notEqual(mapped.name, "AbortError");
  });

  it("treats 500 as timeout-like alongside 429/502/503/504", () => {
    assert.equal(isTimeoutLikeOverpassStatus(500), true);
    assert.equal(isTimeoutLikeOverpassStatus(429), true);
    assert.equal(isTimeoutLikeOverpassStatus(400), false);
  });
});

describe("fetchOverpassWithFailover", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  it("all endpoints AbortError → throws Overpass timed out.", async () => {
    const targets = [];
    globalThis.fetch = async (url) => {
      targets.push(String(url));
      throw abortError();
    };

    await assert.rejects(
      () => fetchOverpassWithFailover("[out:json];out;"),
      (error) => {
        assert.equal(error.message, "Overpass timed out.");
        assert.notEqual(error.name, "AbortError");
        return true;
      },
    );
    assert.deepEqual(targets, [...OVERPASS_ENDPOINTS]);
  });

  it("504 then 200 → success", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(504);
      }
      return jsonResponse(200, '{"elements":[]}');
    };

    const response = await fetchOverpassWithFailover("[out:json];out;");
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  });

  it("500 then 200 → success", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(500);
      }
      return jsonResponse(200, '{"elements":[]}');
    };

    const response = await fetchOverpassWithFailover("[out:json];out;");
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  });

  it("400 on all endpoints → Overpass query failed.", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return jsonResponse(400);
    };

    await assert.rejects(
      () => fetchOverpassWithFailover("[out:json];out;"),
      (error) => {
        assert.equal(error.message, "Overpass query failed.");
        return true;
      },
    );
    assert.equal(calls, OVERPASS_ENDPOINTS.length);
  });
});
