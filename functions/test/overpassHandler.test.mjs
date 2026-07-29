import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OVERPASS_MAX_RESPONSE_BYTES,
  isOverpassResponseTooLarge,
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
