import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Polygon } from "geojson";
import { MOTION_MAP_SHADE_MS } from "@/domain/device/motion/motionTokens";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
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
    }) => {
      // Mirror react-map-gl: Source id must not change on a live instance.
      const mountedId = React.useRef<string | undefined>(undefined);
      if (mountedId.current === undefined) {
        mountedId.current = id;
      } else if (mountedId.current !== id) {
        throw new Error("source id changed");
      }
      return React.createElement(
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
      );
    },
    Layer: (props: {
      id?: string;
      source?: string;
      type?: string;
      paint?: Record<string, unknown>;
    }) =>
      React.createElement("div", {
        "data-testid": "maplibre-layer",
        "data-layer-id": props.id,
        "data-source": props.source ?? "",
        "data-type": props.type,
        "data-paint": JSON.stringify(props.paint ?? {}),
      }),
  };
});

function layerPaint(layer: HTMLElement): Record<string, unknown> {
  return JSON.parse(layer.getAttribute("data-paint") ?? "{}") as Record<
    string,
    unknown
  >;
}

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

  const paint = {
    fill: {
      fillColor: MAP_ANNOTATION_COLORS.elimination,
      fillOpacity: 0.35,
    },
    line: { color: MAP_ANNOTATION_COLORS.playArea, width: 2 },
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
        fill={paint.fill}
        line={paint.line}
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

  it("remounts Source when overlay id changes (JETLAG-3A)", () => {
    const data = polygonGeometryFeature(geometry);
    const { rerender } = render(
      <MapLibreGeoJsonOverlay id="overlay-a" data={data} {...paint} />,
    );

    expect(screen.getByTestId("maplibre-source")).toHaveAttribute(
      "data-source-id",
      "overlay-a-src",
    );

    expect(() => {
      rerender(<MapLibreGeoJsonOverlay id="overlay-b" data={data} {...paint} />);
    }).not.toThrow();

    expect(screen.getByTestId("maplibre-source")).toHaveAttribute(
      "data-source-id",
      "overlay-b-src",
    );
    const layers = screen.getAllByTestId("maplibre-layer");
    expect(layers[0]).toHaveAttribute("data-layer-id", "overlay-b-fill");
    expect(layers[1]).toHaveAttribute("data-layer-id", "overlay-b-line");
  });

  it("unmounts Source on empty data so a later id change does not reuse it", () => {
    const data = polygonGeometryFeature(geometry);
    const { rerender } = render(
      <MapLibreGeoJsonOverlay id="overlay-a" data={data} {...paint} />,
    );

    rerender(<MapLibreGeoJsonOverlay id="overlay-a" data={null} {...paint} />);
    expect(screen.queryByTestId("maplibre-source")).toBeNull();

    expect(() => {
      rerender(<MapLibreGeoJsonOverlay id="overlay-b" data={data} {...paint} />);
    }).not.toThrow();

    expect(screen.getByTestId("maplibre-source")).toHaveAttribute(
      "data-source-id",
      "overlay-b-src",
    );
  });

  it("applies fill/line opacity transitions when paintTransitionMs is set", () => {
    render(
      <MapLibreGeoJsonOverlay
        id="shade"
        data={polygonGeometryFeature(geometry)}
        fill={paint.fill}
        line={paint.line}
        paintTransitionMs={MOTION_MAP_SHADE_MS}
      />,
    );

    const layers = screen.getAllByTestId("maplibre-layer");
    const fillPaint = layerPaint(layers[0]!);
    const linePaint = layerPaint(layers[1]!);

    expect(fillPaint["fill-opacity-transition"]).toEqual({
      duration: MOTION_MAP_SHADE_MS,
    });
    expect(linePaint["line-opacity-transition"]).toEqual({
      duration: MOTION_MAP_SHADE_MS,
    });
  });

  it("uses zero opacity transitions when paintTransitionMs is 0", () => {
    render(
      <MapLibreGeoJsonOverlay
        id="shade"
        data={polygonGeometryFeature(geometry)}
        fill={paint.fill}
        line={paint.line}
        paintTransitionMs={0}
      />,
    );

    const layers = screen.getAllByTestId("maplibre-layer");
    expect(layerPaint(layers[0]!)["fill-opacity-transition"]).toEqual({
      duration: 0,
    });
    expect(layerPaint(layers[1]!)["line-opacity-transition"]).toEqual({
      duration: 0,
    });
  });

  it("keeps Source id stable across data updates", () => {
    const first = polygonGeometryFeature(geometry);
    const second: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 0],
        ],
      ],
    };
    const { rerender } = render(
      <MapLibreGeoJsonOverlay
        id="combined-elimination"
        data={first}
        fill={paint.fill}
        paintTransitionMs={MOTION_MAP_SHADE_MS}
      />,
    );

    expect(screen.getByTestId("maplibre-source")).toHaveAttribute(
      "data-source-id",
      "combined-elimination-src",
    );

    expect(() => {
      rerender(
        <MapLibreGeoJsonOverlay
          id="combined-elimination"
          data={polygonGeometryFeature(second)}
          fill={paint.fill}
          paintTransitionMs={MOTION_MAP_SHADE_MS}
        />,
      );
    }).not.toThrow();

    expect(screen.getByTestId("maplibre-source")).toHaveAttribute(
      "data-source-id",
      "combined-elimination-src",
    );
  });
});
