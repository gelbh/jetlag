import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { tryPostpassForOverpassQuery } from "../proxies/postpassFailover.mjs";

describe("tryPostpassForOverpassQuery", () => {
  afterEach(() => mock.restoreAll());

  it("serves an empty admin result and logs bbox and admin level", async () => {
    mock.method(globalThis, "fetch", async () =>
      Response.json({ type: "FeatureCollection", features: [] }),
    );
    const logs = [];
    mock.method(console, "log", (line) => logs.push(JSON.parse(line)));

    const result = await tryPostpassForOverpassQuery(
      `[out:json];( relation["boundary"="administrative"]["admin_level"="8"]["name"](53.2,-6.4,53.4,-6.1); );out center;>;out geom qt;`,
    );

    assert.deepEqual(result, { text: '{"elements":[]}', empty: true });
    assert.deepEqual(logs.at(-1), {
      type: "overpass_failover",
      backend: "postpass",
      family: "admin",
      endpoint: "postpass.geofabrik.de",
      error: "empty",
      served: true,
      bbox: { south: 53.2, west: -6.4, north: 53.4, east: -6.1 },
      adminLevel: "8",
    });
  });

  it("does not serve an empty places result", async () => {
    mock.method(globalThis, "fetch", async () =>
      Response.json({ type: "FeatureCollection", features: [] }),
    );
    const logs = [];
    mock.method(console, "log", (line) => logs.push(JSON.parse(line)));

    const result = await tryPostpassForOverpassQuery(
      `[out:json][timeout:25];(node["amenity"="cafe"](53.3,-6.3,53.4,-6.2););out center 200;`,
    );

    assert.equal(result, null);
    assert.equal(logs.at(-1).family, "places");
    assert.equal(logs.at(-1).served, false);
  });
});
