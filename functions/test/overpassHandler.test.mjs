import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOverpassResponseTooLarge,
  OVERPASS_MAX_RESPONSE_BYTES,
  overpassUpstreamErrorStatus,
} from "../proxies/handlers/overpass.mjs";

describe("overpassHandler response cap", () => {
  it("defines a 4MB hard cap", () => {
    assert.equal(OVERPASS_MAX_RESPONSE_BYTES, 4_000_000);
  });

  it("rejects responses larger than the cap", () => {
    assert.equal(isOverpassResponseTooLarge("x".repeat(4_000_000)), false);
    assert.equal(isOverpassResponseTooLarge("x".repeat(4_000_001)), true);
  });
});

describe("overpassUpstreamErrorStatus", () => {
  it("maps outage to 503 and timeout to 504", () => {
    assert.equal(overpassUpstreamErrorStatus(new Error("Overpass unavailable.")), 503);
    assert.equal(overpassUpstreamErrorStatus(new Error("Overpass timed out.")), 504);
  });

  it("leaves other errors to the default 502 path", () => {
    assert.equal(overpassUpstreamErrorStatus(new Error("Overpass query failed.")), null);
    assert.equal(overpassUpstreamErrorStatus("Overpass unavailable."), null);
  });
});
