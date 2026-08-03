import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearOverpassCachesForTests,
  fetchCachedOverpassQuery,
} from "../proxies/overpassProxyCore.mjs";

describe("overpass Postpass failover", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearOverpassCachesForTests();
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
});
