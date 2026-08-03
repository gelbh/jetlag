import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Polygon } from "geojson";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { MapLibreGeoJsonOverlay } from "./MapLibreGeoJsonOverlay";
import { polygonGeometryFeature } from "./polygonGeometryFeature";
import { circleMarkerCollection } from "./mapMarkerFeatures";

vi.mock("react-map-gl/maplibre", async () => {
  const React = await import("react");
  return {
    Source: ({
      id,
      children,
    }: {
      id?: string;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "maplibre-source", "data-source-id": id },
        React.Children.map(children, (child) =>
          child && React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<{ source?: string }>,
                { source: id },
              )
            : child,
        ),
      ),
    Layer: (props: { id?: string; source?: string; type?: string }) =>
      React.createElement("div", {
        "data-testid": "maplibre-layer",
        "data-layer-id": props.id,
        "data-source": props.source ?? "",
        "data-type": props.type,
      }),
  };
});

describe("MapLibreGeoJsonOverlay", () => {
  const geometry: Polygon = {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  };

  it("wraps a polygon geometry as a Feature", () => {
    const feature = polygonGeometryFeature(geometry);
    expect(feature.type).toBe("Feature");
    expect(feature.geometry).toEqual(geometry);
  });

  it("passes source ids to fill/line layers as direct Source children", () => {
    render(
      <MapLibreGeoJsonOverlay
        id="game-area-outside"
        data={polygonGeometryFeature(geometry)}
        fill={{
          fillColor: MAP_ANNOTATION_COLORS.elimination,
          fillOpacity: 0.35,
        }}
        line={{ color: MAP_ANNOTATION_COLORS.playArea, width: 2 }}
      />,
    );

    expect(screen.getByTestId("maplibre-source")).toHaveAttribute(
      "data-source-id",
      "game-area-outside-src",
    );

    const layers = screen.getAllByTestId("maplibre-layer");
    expect(layers).toHaveLength(2);
    for (const layer of layers) {
      expect(layer).toHaveAttribute("data-source", "game-area-outside-src");
    }
    expect(layers[0]).toHaveAttribute(
      "data-layer-id",
      "game-area-outside-fill",
    );
    expect(layers[1]).toHaveAttribute(
      "data-layer-id",
      "game-area-outside-line",
    );
  });

  it("renders circle and symbol layers from specs", () => {
    render(
      <MapLibreGeoJsonOverlay
        id="marker-test"
        data={circleMarkerCollection([
          {
            id: "m1",
            lat: 0,
            lng: 0,
            radiusPx: 8,
            fillColor: MAP_ANNOTATION_COLORS.pin,
            borderColor: MAP_ANNOTATION_COLORS.strokeLight,
          },
        ])}
        circle={{
          radius: ["get", "radiusPx"],
          color: ["get", "fillColor"],
          strokeColor: ["get", "borderColor"],
          strokeWidth: ["get", "borderWidth"],
        }}
        symbol={{
          layout: {
            textField: ["get", "text"],
            textSize: 12,
          },
        }}
      />,
    );

    const layers = screen.getAllByTestId("maplibre-layer");
    expect(layers.some((layer) => layer.getAttribute("data-type") === "circle")).toBe(
      true,
    );
    expect(layers.some((layer) => layer.getAttribute("data-type") === "symbol")).toBe(
      true,
    );
  });
});
