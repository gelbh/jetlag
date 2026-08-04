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
    const hosts = OVERPASS_ENDPOINTS.map((u) => overpassEndpointHost(u));
    assert.ok(hosts.includes("overpass.private.coffee"));
    assert.equal(hosts.includes("overpass.kumi.systems"), false);
  });

  it("adds Geofabrik paid peer only when key present", () => {
    const without = buildOverpassEndpointList({});
    const withoutHosts = without.map((u) => overpassEndpointHost(u));
    assert.equal(withoutHosts.includes("overpass.geofabrik.de"), false);

    const withKey = buildOverpassEndpointList({
      GEOFABRIK_OVERPASS_API_KEY: "test-key",
    });
    const geofabrikUrl = withKey.find(
      (u) => overpassEndpointHost(u) === "overpass.geofabrik.de",
    );
    assert.ok(geofabrikUrl);
    assert.equal(
      geofabrikUrl,
      "https://overpass.geofabrik.de/test-key/api/interpreter",
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
