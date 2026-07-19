import { describe, it } from "node:test";
import assert from "node:assert/strict";

async function loadTransitlandProxy() {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async (url) => {
    fetchCount += 1;
    const href = String(url);
    if (href.includes("vehicle_positions.json")) {
      return Response.json({
        entity: [
          {
            id: "veh-1",
            vehicle: {
              position: { latitude: 53.35, longitude: -6.26 },
              trip: { routeId: "route-1" },
              vehicle: { label: "Bus 1" },
            },
          },
        ],
      });
    }

    return Response.json({
      vehicle_positions: [
        {
          id: "veh-2",
          position: { latitude: 53.36, longitude: -6.25 },
          trip: { route_id: "route-2" },
          vehicle: { label: "Tram 2" },
        },
      ],
    });
  };

  const module = await import(`../proxies/transitlandProxy.mjs?test=${Date.now()}`);
  return {
    module,
    getFetchCount: () => fetchCount,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

describe("transitlandProxy", () => {
  it("normalizes rt and rest vehicle payloads within bounds", async () => {
    const { module, restore } = await loadTransitlandProxy();

    try {
      const { fetchTransitlandVehicles, clearTransitlandCacheForTests } =
        module;
      clearTransitlandCacheForTests();
      const bounds = { south: 53.2, west: -6.5, north: 53.5, east: -6.0 };

      const rtVehicles = await fetchTransitlandVehicles(
        "f-feed~rt",
        "test-key",
        bounds,
      );
      assert.equal(rtVehicles.length, 1);
      assert.equal(rtVehicles[0].label, "Bus 1");

      const restVehicles = await fetchTransitlandVehicles(
        "f-feed",
        "test-key",
        bounds,
      );
      assert.equal(restVehicles.length, 1);
      assert.equal(restVehicles[0].label, "Tram 2");
    } finally {
      restore();
    }
  });

  it("reuses L1 cache within 5 minutes for identical feed+bounds", async () => {
    const { module, getFetchCount, restore } = await loadTransitlandProxy();

    try {
      const { fetchTransitlandVehicles, clearTransitlandCacheForTests } =
        module;
      clearTransitlandCacheForTests();
      const bounds = { south: 53.2, west: -6.5, north: 53.5, east: -6.0 };

      await fetchTransitlandVehicles("f-feed", "test-key", bounds);
      await fetchTransitlandVehicles("f-feed", "test-key", bounds);
      assert.equal(getFetchCount(), 1);
    } finally {
      restore();
    }
  });
});
