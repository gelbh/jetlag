import { describe, expect, it, vi } from "vitest";
import type { MapGeoJSONFeature } from "maplibre-gl";
import {
  dispatchMapFeatureHit,
  featureHitId,
  featureHitKind,
  queryBasemapPoiAtPoint,
  queryJlMarkerFeatures,
} from "./mapFeatureHitTest";
import { isJlMarkerLayerId, jlMarkerLayerId } from "./mapMarkerConstants";

describe("mapMarkerConstants", () => {
  it("builds jl-marker layer ids", () => {
    expect(jlMarkerLayerId("transit")).toBe("jl-marker-transit");
    expect(isJlMarkerLayerId("jl-marker-transit-stops-circle")).toBe(true);
    expect(isJlMarkerLayerId("transit-routes-rail-line")).toBe(false);
  });
});

describe("mapFeatureHitTest", () => {
  function mockFeature(
    hitId: string,
    hitKind: string,
    layerId: string,
  ): MapGeoJSONFeature {
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { hitId, hitKind },
      layer: { id: layerId },
    } as unknown as MapGeoJSONFeature;
  }

  it("reads hit id and kind from feature properties", () => {
    const feature = mockFeature(
      "stop-1",
      "transit-stop",
      "jl-marker-transit-stops-circle",
    );
    expect(featureHitId(feature)).toBe("stop-1");
    expect(featureHitKind(feature)).toBe("transit-stop");
  });

  it("dispatches by hitId before layer prefix", () => {
    const result = {
      feature: mockFeature("pin-a", "pin", "jl-marker-pin-a-circle"),
      layerId: "jl-marker-pin-a-circle",
      lngLat: { lng: 0, lat: 0 } as never,
    };
    const calls: string[] = [];
    const handled = dispatchMapFeatureHit(
      {
        byHitId: new Map([
          [
            "pin-a",
            () => {
              calls.push("byHitId");
              return true;
            },
          ],
        ]),
        byLayerPrefix: new Map([
          [
            "jl-marker-pin",
            () => {
              calls.push("byPrefix");
              return true;
            },
          ],
        ]),
      },
      result,
    );
    expect(handled).toBe(true);
    expect(calls).toEqual(["byHitId"]);
  });

  it("falls back to layer prefix when hitId has no handler", () => {
    const result = {
      feature: mockFeature(
        "vehicle-9",
        "transit-vehicle",
        "jl-marker-transit-vehicles-symbol",
      ),
      layerId: "jl-marker-transit-vehicles-symbol",
      lngLat: { lng: 0, lat: 0 } as never,
    };
    const handled = dispatchMapFeatureHit(
      {
        byHitId: new Map(),
        byLayerPrefix: new Map([
          [
            jlMarkerLayerId("transit"),
            (hit) => featureHitId(hit.feature) === "vehicle-9",
          ],
        ]),
      },
      result,
    );
    expect(handled).toBe(true);
  });

  it("returns null when no jl-marker layers exist", () => {
    const queryRenderedFeatures = vi.fn();
    const map = {
      getStyle: () => ({ layers: [{ id: "transit-routes-rail-line" }] }),
      queryRenderedFeatures,
    } as unknown as import("maplibre-gl").Map;
    expect(queryJlMarkerFeatures(map, { x: 1, y: 2 })).toBeNull();
    expect(queryRenderedFeatures).not.toHaveBeenCalled();
  });

  it("ignores basemap POI taps on satellite", () => {
    const querySourceFeatures = vi.fn();
    const map = {
      getStyle: () => ({ sources: { openmaptiles: {} }, layers: [] }),
      querySourceFeatures,
    } as unknown as import("maplibre-gl").Map;
    expect(
      queryBasemapPoiAtPoint(map, "satellite", [51.5, -0.1], ["museum"]),
    ).toBeNull();
    expect(querySourceFeatures).not.toHaveBeenCalled();
  });
});
