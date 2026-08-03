import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OVERPASS_ENDPOINTS,
  buildOverpassEndpointList,
  OVERPASS_USER_AGENT,
  overpassEndpointHost,
} from "../proxies/overpassEndpoints.mjs";

describe("overpassEndpoints", () => {
  it("exposes multiple fallback endpoints", () => {
    assert.ok(OVERPASS_ENDPOINTS.length >= 2);
    assert.match(OVERPASS_ENDPOINTS[0], /overpass/i);
  });

  it("lists private.coffee and omits kumi", () => {
    assert.ok(
      OVERPASS_ENDPOINTS.includes(
        "https://overpass.private.coffee/api/interpreter",
      ),
    );
    assert.equal(
      OVERPASS_ENDPOINTS.some((u) => u.includes("kumi.systems")),
      false,
    );
  });

  it("adds Geofabrik paid peer only when key present", () => {
    const without = buildOverpassEndpointList({});
    assert.equal(
      without.some((u) => u.includes("overpass.geofabrik.de")),
      false,
    );
    const withKey = buildOverpassEndpointList({
      GEOFABRIK_OVERPASS_API_KEY: "test-key",
    });
    assert.ok(
      withKey.includes(
        "https://overpass.geofabrik.de/test-key/api/interpreter",
      ),
    );
  });

  it("uses a stable user agent", () => {
    assert.match(OVERPASS_USER_AGENT, /jetlag-map-companion/);
  });

  it("redacts paid URL to host for logs", () => {
    assert.equal(
      overpassEndpointHost(
        "https://overpass.geofabrik.de/test-key/api/interpreter",
      ),
      "overpass.geofabrik.de",
    );
  });
});
