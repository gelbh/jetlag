import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearOverpassCachesForTests,
  fetchCachedOverpassQuery,
} from "../proxies/overpassProxyCore.mjs";
import {
  createMemoryL2Backend,
  overpassL2CacheKey,
  setOverpassL2BackendForTests,
} from "../proxies/overpassSharedCache.mjs";

describe("overpass Postpass failover", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearOverpassCachesForTests();
    setOverpassL2BackendForTests(null);
  });

  it("all Overpass fail → Postpass success → elements JSON", async () => {
    clearOverpassCachesForTests();
    let postpassCalls = 0;
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes("postpass.geofabrik.de")) {
        postpassCalls += 1;
        return new Response(
          JSON.stringify({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {
                  osm_type: "N",
                  osm_id: 1,
                  tags: { amenity: "cafe", name: "A" },
                },
                geometry: { type: "Point", coordinates: [-6.25, 53.35] },
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (u.includes("/api/status")) {
        return new Response("Slot available after: 0\n", { status: 200 });
      }
      return new Response("", { status: 503 });
    };
    const text = await fetchCachedOverpassQuery(
      `[out:json][timeout:25];(node["amenity"="cafe"](53.3,-6.3,53.4,-6.2););out center 200;`,
    );
    const body = JSON.parse(text);
    assert.ok(Array.isArray(body.elements));
    assert.equal(body.elements[0].type, "node");
    assert.equal(postpassCalls, 1);
  });

  it("Overpass success does not call Postpass", async () => {
    clearOverpassCachesForTests();
    let postpassCalls = 0;
    globalThis.fetch = async (url) => {
      if (String(url).includes("postpass")) {
        postpassCalls += 1;
      }
      if (String(url).includes("/api/status")) {
        return new Response("Slot available after: 0\n", { status: 200 });
      }
      return new Response('{"elements":[]}', { status: 200 });
    };
    await fetchCachedOverpassQuery("[out:json];out;");
    assert.equal(postpassCalls, 0);
  });

  it("empty Postpass is not cached as a successful miss", async () => {
    clearOverpassCachesForTests();
    const query = `[out:json][timeout:25];(node["amenity"="cafe"](53.3,-6.3,53.4,-6.2););out center 200;`;
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes("postpass.geofabrik.de")) {
        return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
          status: 200,
        });
      }
      if (u.includes("/api/status")) {
        return new Response("Slot available after: 0\n", { status: 200 });
      }
      return new Response("", { status: 503 });
    };
    await assert.rejects(() => fetchCachedOverpassQuery(query));

    let postpassCalls = 0;
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes("postpass.geofabrik.de")) {
        postpassCalls += 1;
        return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
          status: 200,
        });
      }
      if (u.includes("/api/status")) {
        return new Response("Slot available after: 0\n", { status: 200 });
      }
      return new Response("", { status: 503 });
    };
    await assert.rejects(() => fetchCachedOverpassQuery(query));
    assert.equal(postpassCalls, 1);
  });

  const ADMIN_QUERY = `[out:json][timeout:25];(relation["boundary"="administrative"]["admin_level"="8"]["name"](55.8188,-3.4495,56.004,-3.075););out center;>;out geom qt;`;

  function emptyPostpassFetch(counter) {
    return async (url) => {
      const u = String(url);
      if (u.includes("postpass.geofabrik.de")) {
        counter.postpass += 1;
        return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
          status: 200,
        });
      }
      if (u.includes("/api/status")) {
        return new Response("Slot available after: 0\n", { status: 200 });
      }
      return new Response("", { status: 503 });
    };
  }

  it("empty admin Postpass returns empty elements without caching", async () => {
    const backend = createMemoryL2Backend();
    setOverpassL2BackendForTests(backend);
    const counter = { postpass: 0 };
    globalThis.fetch = emptyPostpassFetch(counter);

    assert.equal(await fetchCachedOverpassQuery(ADMIN_QUERY), '{"elements":[]}');
    assert.equal(await fetchCachedOverpassQuery(ADMIN_QUERY), '{"elements":[]}');
    assert.equal(counter.postpass, 2);
    assert.equal(await backend.kvGet(overpassL2CacheKey(ADMIN_QUERY, "free")), null);
  });

  it("stale L2 wins over an empty admin Postpass result", async () => {
    const backend = createMemoryL2Backend();
    setOverpassL2BackendForTests(backend);
    const key = overpassL2CacheKey(ADMIN_QUERY, "free");
    const staleText = '{"elements":[{"type":"relation","id":1}]}';
    await backend.r2Put(`overpass/${key}`, staleText, "application/json");
    await backend.kvPut(
      key,
      JSON.stringify({
        r2Key: `overpass/${key}`,
        expiresAt: Date.now() - 1,
        contentType: "application/json",
        status: 200,
      }),
    );
    const counter = { postpass: 0 };
    globalThis.fetch = emptyPostpassFetch(counter);

    assert.equal(await fetchCachedOverpassQuery(ADMIN_QUERY), staleText);
    assert.equal(counter.postpass, 1);
  });
});
