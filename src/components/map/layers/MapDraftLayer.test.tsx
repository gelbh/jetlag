import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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

vi.mock("react-map-gl/maplibre", () => ({
  Marker: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-marker">{children}</div>
  ),
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
  it("activates tentacle POI pins from the frosted marker control", () => {
    const onMarkerActivate = vi.fn(() => true);

    render(
      <MapDraftLayer
        overlays={[
          {
            kind: "marker",
            id: "tentacle-draft-poi-poi-1",
            point: [53.35, -6.26],
            popup: "Museum",
            style: { tentaclePoiSelected: false, tentacleCategoryId: "museum" },
          },
        ]}
        onMarkerActivate={onMarkerActivate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Museum" }));
    expect(onMarkerActivate).toHaveBeenCalledWith("tentacle-draft-poi-poi-1");
    expect(screen.getByTestId("tentacle-poi-pin")).toBeInTheDocument();
  });

  it("marks the chosen tentacle place as selected", () => {
    render(
      <MapDraftLayer
        overlays={[
          {
            kind: "marker",
            id: "tentacle-draft-poi-poi-1",
            point: [53.35, -6.26],
            popup: "Museum",
            style: { tentaclePoiSelected: true, tentacleCategoryId: "museum" },
          },
        ]}
      />,
    );

    expect(screen.getByTestId("tentacle-poi-pin")).toHaveAttribute(
      "data-selected",
      "1",
    );
  });

  it("returns false when activate declines a no-popup marker", () => {
    const onMarkerActivate = vi.fn(() => false);
    hitHandler = null;

    render(
      <MapDraftLayer
        overlays={[
          {
            kind: "marker",
            id: "draft-pin-1",
            point: [53.35, -6.26],
          },
        ]}
        onMarkerActivate={onMarkerActivate}
      />,
    );

    expect(hitHandler!(fakeHit("draft-pin-1"))).toBe(false);
    expect(onMarkerActivate).toHaveBeenCalledWith("draft-pin-1");
  });
});
