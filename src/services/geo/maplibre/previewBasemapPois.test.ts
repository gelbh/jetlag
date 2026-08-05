import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  previewBasemapPois,
  satelliteBasemapPoiUnavailableMessage,
} from "./previewBasemapPois";

describe("previewBasemapPois", () => {
  it("returns empty on satellite without querying the map", () => {
    const querySourceFeatures = vi.fn();
    const map = {
      getStyle: () => ({ sources: { openmaptiles: {} }, layers: [] }),
      querySourceFeatures,
    } as unknown as MapLibreMap;

    expect(
      previewBasemapPois({
        map,
        mapStyle: "satellite",
        categoryIds: ["museum"],
      }),
    ).toEqual([]);
    expect(querySourceFeatures).not.toHaveBeenCalled();
  });

  it("filters street candidates by max distance from point", () => {
    const map = {
      getStyle: () => ({
        sources: { openmaptiles: {} },
        layers: [],
      }),
      querySourceFeatures: () => [
        {
          type: "Feature",
          id: 1,
          properties: { name: "Near", class: "museum" },
          geometry: { type: "Point", coordinates: [-0.1, 51.5] },
        },
        {
          type: "Feature",
          id: 2,
          properties: { name: "Far", class: "museum" },
          geometry: { type: "Point", coordinates: [0.5, 52.5] },
        },
      ],
    } as unknown as MapLibreMap;

    const hits = previewBasemapPois({
      map,
      mapStyle: "standard",
      categoryIds: ["museum"],
      point: [51.5, -0.1],
      maxDistanceMeters: 500,
      maxResults: 10,
    });

    expect(hits.map((hit) => hit.name)).toEqual(["Near"]);
    expect(hits[0]?.confirmStatus).toBe("provisional");
  });

  it("names satellite unavailability without sounding like a resolve failure", () => {
    expect(satelliteBasemapPoiUnavailableMessage()).toMatch(/satellite/i);
    expect(satelliteBasemapPoiUnavailableMessage()).not.toMatch(/resolve/i);
  });
});
