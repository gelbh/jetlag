import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OVERPASS_ENDPOINTS,
  OVERPASS_USER_AGENT,
} from "../proxies/overpassEndpoints.mjs";

describe("overpassEndpoints", () => {
  it("exposes multiple fallback endpoints", () => {
    assert.ok(OVERPASS_ENDPOINTS.length >= 2);
    assert.match(OVERPASS_ENDPOINTS[0], /overpass/i);
  });

  it("uses a stable user agent", () => {
    assert.match(OVERPASS_USER_AGENT, /jetlag-map-companion/);
  });
});
