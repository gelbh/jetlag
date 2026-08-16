import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { MapGeoJSONFeature } from "maplibre-gl";
import type { MapFeatureHitResult } from "../helpers/mapFeatureHitTest";
import { MapDraftLayer } from "./MapDraftLayer";

let hitHandler:
  | ((result: MapFeatureHitResult) => boolean | void)
  | null = null;

vi.mock("../helpers/MapFeatureHitTestContext", () => ({
  useMapFeatureHitTest: (
    _prefix: string,
    handler: (result: MapFeatureHitResult) => boolean | void,
  ) => {
    hitHandler = handler;
  },
}));

vi.mock("../helpers/MapLibrePointMarkers", () => ({
  MapLibrePointMarkers: () => null,
}));

vi.mock("../helpers/MapLibreGeoJsonOverlay", () => ({
  MapLibreGeoJsonOverlay: () => null,
}));

vi.mock("../helpers/MapLibreFeaturePopup", () => ({
  MapLibreFeaturePopup: () => null,
}));

function fakeHit(hitId: string): MapFeatureHitResult {
  return {
    feature: {
      type: "Feature",
      properties: { hitId },
      geometry: { type: "Point", coordinates: [0, 0] },
    } as unknown as MapGeoJSONFeature,
    layerId: "jl-marker-draft",
    lngLat: { lng: 0, lat: 0 } as MapFeatureHitResult["lngLat"],
  };
}

describe("MapDraftLayer", () => {
  it("invokes onMarkerActivate for draft marker hits", () => {
    const onMarkerActivate = vi.fn(() => true);
    hitHandler = null;

    render(
      <MapDraftLayer
        overlays={[
          {
            kind: "marker",
            id: "tentacle-draft-poi-poi-1",
            point: [53.35, -6.26],
            popup: "Museum",
          },
        ]}
        onMarkerActivate={onMarkerActivate}
      />,
    );

    expect(hitHandler).toBeTypeOf("function");
    expect(hitHandler!(fakeHit("tentacle-draft-poi-poi-1"))).toBe(true);
    expect(onMarkerActivate).toHaveBeenCalledWith("tentacle-draft-poi-poi-1");
  });

  it("still consumes popup-only hits when activate returns false", () => {
    const onMarkerActivate = vi.fn(() => false);
    hitHandler = null;

    render(
      <MapDraftLayer
        overlays={[
          {
            kind: "marker",
            id: "tentacle-draft-poi-poi-2",
            point: [53.35, -6.26],
            popup: "Gallery",
          },
        ]}
        onMarkerActivate={onMarkerActivate}
      />,
    );

    expect(hitHandler!(fakeHit("tentacle-draft-poi-poi-2"))).toBe(true);
    expect(onMarkerActivate).toHaveBeenCalledWith("tentacle-draft-poi-poi-2");
  });
});
