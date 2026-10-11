import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOverpassEndpointList, overpassEndpointHost } from "../proxies/overpassEndpoints.mjs";
import {
  parseOverpassQueryBbox,
  regionalOverpassEndpointsForBbox,
} from "../proxies/overpassRegionPeers.mjs";

describe("overpassRegionPeers", () => {
  it("parses the first south,west,north,east bbox from QL", () => {
    const q = "[out:json];node(47.3,8.4,47.5,8.6)[amenity=cafe];out;";
    assert.deepEqual(parseOverpassQueryBbox(q), {
      south: 47.3,
      west: 8.4,
      north: 47.5,
      east: 8.6,
    });
  });

  it("prepends Swiss peer for a Zurich bbox", () => {
    const bbox = { south: 47.3, west: 8.4, north: 47.5, east: 8.6 };
    const regional = regionalOverpassEndpointsForBbox(bbox);
    assert.equal(regional.length, 1);
    assert.equal(overpassEndpointHost(regional[0]), "overpass.osm.ch");

    const list = buildOverpassEndpointList(
      {},
      { query: "[out:json];node(47.3,8.4,47.5,8.6);out;" },
    );
    assert.equal(overpassEndpointHost(list[0]), "overpass.osm.ch");
  });

  it("omits regional peers for an NYC bbox", () => {
    const list = buildOverpassEndpointList(
      {},
      { query: "[out:json];node(40.6,-74.1,40.9,-73.7);out;" },
    );
    const hosts = list.map((u) => overpassEndpointHost(u));
    assert.equal(hosts.includes("overpass.osm.ch"), false);
    assert.equal(hosts.includes("overpass.atownsend.org.uk"), false);
  });

  it("keeps regional before Geofabrik when both apply", () => {
    const list = buildOverpassEndpointList(
      { GEOFABRIK_OVERPASS_API_KEY: "geo-key" },
      { query: "[out:json];node(47.3,8.4,47.5,8.6);out;" },
    );
    assert.equal(overpassEndpointHost(list[0]), "overpass.osm.ch");
    assert.equal(overpassEndpointHost(list[1]), "overpass.geofabrik.de");
  });

  it("does not ship Britain and Ireland after failed gate", () => {
    const list = buildOverpassEndpointList(
      {},
      { query: "[out:json];node(53.2,-6.4,53.5,-6.1);out;" },
    );
    assert.equal(
      list.map((u) => overpassEndpointHost(u)).includes("overpass.atownsend.org.uk"),
      false,
    );
  });
});
