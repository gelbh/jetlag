import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProxyRoute, PROXY_ROUTE_NAMES } from "../proxies/proxyRouter.mjs";

describe("proxyRouter", () => {
  it("recognizes supported route names", () => {
    assert.deepEqual(PROXY_ROUTE_NAMES, ["overpass", "transitland", "vehicles"]);
  });

  it("resolves route from path segment", () => {
    assert.equal(resolveProxyRoute("/overpass"), "overpass");
    assert.equal(resolveProxyRoute("/vehicles"), "vehicles");
    assert.equal(resolveProxyRoute("/transitland"), "transitland");
    assert.equal(resolveProxyRoute("overpass"), "overpass");
  });

  it("returns null for unknown or empty paths", () => {
    assert.equal(resolveProxyRoute("/"), null);
    assert.equal(resolveProxyRoute(""), null);
    assert.equal(resolveProxyRoute("/unknown"), null);
    assert.equal(resolveProxyRoute(undefined), null);
  });

  it("uses first segment when nested paths are present", () => {
    assert.equal(resolveProxyRoute("/overpass/extra"), "overpass");
  });
});
