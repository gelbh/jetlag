import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  isBasemapPoiQueryAvailable,
  queryBasemapPois,
} from "./basemapPoiQuery";

function mockMap(options: {
  hasOpenMapTiles?: boolean;
  sourceFeatures?: unknown[];
  renderedFeatures?: unknown[];
  layers?: { id: string }[];
}): MapLibreMap {
  const hasOpenMapTiles = options.hasOpenMapTiles ?? true;
  const querySourceFeatures = vi.fn(() => options.sourceFeatures ?? []);
  const queryRenderedFeatures = vi.fn(() => options.renderedFeatures ?? []);

  return {
    getStyle: () => ({
      sources: hasOpenMapTiles ? { openmaptiles: { type: "vector" } } : {},
      layers: options.layers ?? [
        { id: "poi_r20" },
        { id: "poi_transit" },
      ],
    }),
    querySourceFeatures,
    queryRenderedFeatures,
  } as unknown as MapLibreMap & {
    querySourceFeatures: ReturnType<typeof vi.fn>;
    queryRenderedFeatures: ReturnType<typeof vi.fn>;
  };
}

function poiFeature(overrides: {
  name: string;
  class?: string;
  subclass?: string;
  lat: number;
  lng: number;
  osmId?: number;
  featureId?: number | string;
  omitPropertyOsmId?: boolean;
}) {
  const properties: Record<string, unknown> = {
    name: overrides.name,
    class: overrides.class,
    subclass: overrides.subclass,
  };
  if (!overrides.omitPropertyOsmId && overrides.osmId != null) {
    properties.osm_id = overrides.osmId;
  }
  return {
    type: "Feature",
    id: overrides.featureId,
    properties,
    geometry: {
      type: "Point",
      coordinates: [overrides.lng, overrides.lat],
    },
  };
}

describe("basemapPoiQuery", () => {
  it("isBasemapPoiQueryAvailable is false for satellite", () => {
    expect(isBasemapPoiQueryAvailable("standard")).toBe(true);
    expect(isBasemapPoiQueryAvailable("satellite")).toBe(false);
  });

  it("returns provisional candidates from querySourceFeatures when openmaptiles present", () => {
    const map = mockMap({
      sourceFeatures: [
        poiFeature({
          name: "British Museum",
          class: "museum",
          lat: 51.5194,
          lng: -0.127,
          osmId: 42,
        }),
      ],
    });

    const results = queryBasemapPois(map, { categoryIds: ["museum"] });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "British Museum",
      categoryId: "museum",
      source: "tile",
      confirmStatus: "provisional",
      osmId: "42",
      point: [51.5194, -0.127],
    });
    expect(map.querySourceFeatures).toHaveBeenCalledWith("openmaptiles", {
      sourceLayer: "poi",
    });
  });

  it("returns [] without calling query when openmaptiles source missing (satellite-style)", () => {
    const map = mockMap({ hasOpenMapTiles: false });
    const results = queryBasemapPois(map, { categoryIds: ["museum"] });
    expect(results).toEqual([]);
    expect(map.querySourceFeatures).not.toHaveBeenCalled();
  });

  it("falls back to queryRenderedFeatures on poi_r* / poi_transit when source empty", () => {
    const map = mockMap({
      sourceFeatures: [],
      renderedFeatures: [
        poiFeature({
          name: "King's Cross",
          class: "railway",
          subclass: "station",
          lat: 51.5308,
          lng: -0.1238,
        }),
      ],
    });

    const results = queryBasemapPois(map, { categoryIds: ["rail_station"] });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("King's Cross");
    expect(map.queryRenderedFeatures).toHaveBeenCalled();
  });

  it("filters by categoryIds", () => {
    const map = mockMap({
      sourceFeatures: [
        poiFeature({
          name: "Museum",
          class: "museum",
          lat: 51.5,
          lng: -0.1,
        }),
        poiFeature({
          name: "Hospital",
          class: "hospital",
          lat: 51.501,
          lng: -0.101,
        }),
      ],
    });

    const results = queryBasemapPois(map, { categoryIds: ["hospital"] });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Hospital");
  });

  it("reads osm id from feature.id when not in properties (OMT key_field)", () => {
    const map = mockMap({
      sourceFeatures: [
        poiFeature({
          name: "Louvre",
          class: "museum",
          lat: 48.8606,
          lng: 2.3376,
          featureId: 98765,
          omitPropertyOsmId: true,
        }),
      ],
    });

    const results = queryBasemapPois(map, { categoryIds: ["museum"] });
    expect(results).toHaveLength(1);
    expect(results[0].osmId).toBe("98765");
    expect(results[0].id).toBe("tile:98765");
  });

  it("excludes hospital-class clinic subclass from hospital filter", () => {
    const map = mockMap({
      sourceFeatures: [
        poiFeature({
          name: "Real Hospital",
          class: "hospital",
          subclass: "hospital",
          lat: 51.5,
          lng: -0.1,
        }),
        poiFeature({
          name: "Walk-in Clinic",
          class: "hospital",
          subclass: "clinic",
          lat: 51.501,
          lng: -0.101,
        }),
      ],
    });

    const results = queryBasemapPois(map, { categoryIds: ["hospital"] });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Real Hospital");
  });
});
