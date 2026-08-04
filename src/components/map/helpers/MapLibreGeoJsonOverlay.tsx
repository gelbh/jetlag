import { useMemo, type ReactElement } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  Geometry,
} from "geojson";

export interface MapLibreFillPaint {
  fillColor: string;
  fillOpacity?: number;
  fillOutlineColor?: string;
}

export type MapLibreLineWidth = number | ExpressionSpecification;

export interface MapLibreLinePaint {
  color: string;
  width?: MapLibreLineWidth;
  opacity?: number;
  dashArray?: number[];
}

export type MapLibreCircleRadius = number | ExpressionSpecification;

export interface MapLibreCirclePaint {
  radius: MapLibreCircleRadius;
  color: string | ExpressionSpecification;
  strokeColor?: string | ExpressionSpecification;
  strokeWidth?: number | ExpressionSpecification;
  opacity?: number | ExpressionSpecification;
}

export interface MapLibreSymbolSpec {
  layout?: {
    iconImage?: string | ExpressionSpecification;
    iconRotate?: number | ExpressionSpecification;
    iconSize?: number | ExpressionSpecification;
    iconAllowOverlap?: boolean;
    textField?: string | ExpressionSpecification;
    textSize?: number | ExpressionSpecification;
    textOffset?: ExpressionSpecification;
    textAnchor?:
      | "center"
      | "left"
      | "right"
      | "top"
      | "bottom"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    textAllowOverlap?: boolean;
  };
  paint?: {
    iconOpacity?: number | ExpressionSpecification;
    textColor?: string | ExpressionSpecification;
    textHaloColor?: string | ExpressionSpecification;
    textHaloWidth?: number | ExpressionSpecification;
  };
}

export interface MapLibreGeoJsonLayerSpec {
  id: string;
  fill?: MapLibreFillPaint | null;
  line?: MapLibreLinePaint | null;
  circle?: MapLibreCirclePaint | null;
  symbol?: MapLibreSymbolSpec | null;
}

function asFeatureCollection(
  data: Feature | FeatureCollection | Geometry,
): FeatureCollection {
  if (data.type === "FeatureCollection") {
    return data;
  }
  if (data.type === "Feature") {
    return { type: "FeatureCollection", features: [data] };
  }
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: data }],
  };
}

/**
 * Layers must be *direct* Source children. react-map-gl clones each child with
 * `source={id}`; Fragments swallow that prop and fill/line layers never paint.
 */
function paintLayersForSpec(
  spec: MapLibreGeoJsonLayerSpec,
  beforeId?: string,
): ReactElement[] {
  const layers: ReactElement[] = [];
  if (spec.fill) {
    layers.push(
      <Layer
        key={`${spec.id}-fill`}
        id={`${spec.id}-fill`}
        type="fill"
        beforeId={beforeId}
        paint={{
          "fill-color": spec.fill.fillColor,
          "fill-opacity": spec.fill.fillOpacity ?? 0.35,
          ...(spec.fill.fillOutlineColor
            ? { "fill-outline-color": spec.fill.fillOutlineColor }
            : {}),
        }}
      />,
    );
  }
  if (spec.line) {
    layers.push(
      <Layer
        key={`${spec.id}-line`}
        id={`${spec.id}-line`}
        type="line"
        beforeId={beforeId}
        paint={{
          "line-color": spec.line.color,
          "line-width": spec.line.width ?? 1,
          "line-opacity": spec.line.opacity ?? 1,
          ...(spec.line.dashArray
            ? { "line-dasharray": spec.line.dashArray }
            : {}),
        }}
        layout={{ "line-join": "round", "line-cap": "round" }}
      />,
    );
  }
  if (spec.circle) {
    layers.push(
      <Layer
        key={`${spec.id}-circle`}
        id={`${spec.id}-circle`}
        type="circle"
        beforeId={beforeId}
        paint={{
          "circle-radius": spec.circle.radius,
          "circle-color": spec.circle.color,
          ...(spec.circle.strokeColor
            ? { "circle-stroke-color": spec.circle.strokeColor }
            : {}),
          ...(spec.circle.strokeWidth != null
            ? { "circle-stroke-width": spec.circle.strokeWidth }
            : {}),
          ...(spec.circle.opacity != null
            ? { "circle-opacity": spec.circle.opacity }
            : {}),
        }}
      />,
    );
  }
  if (spec.symbol) {
    layers.push(
      <Layer
        key={`${spec.id}-symbol`}
        id={`${spec.id}-symbol`}
        type="symbol"
        beforeId={beforeId}
        layout={{
          "icon-allow-overlap": spec.symbol.layout?.iconAllowOverlap ?? true,
          "text-allow-overlap": spec.symbol.layout?.textAllowOverlap ?? true,
          ...(spec.symbol.layout?.iconImage
            ? { "icon-image": spec.symbol.layout.iconImage }
            : {}),
          ...(spec.symbol.layout?.iconRotate != null
            ? { "icon-rotate": spec.symbol.layout.iconRotate }
            : {}),
          ...(spec.symbol.layout?.iconSize != null
            ? { "icon-size": spec.symbol.layout.iconSize }
            : {}),
          ...(spec.symbol.layout?.textField
            ? { "text-field": spec.symbol.layout.textField }
            : {}),
          ...(spec.symbol.layout?.textSize != null
            ? { "text-size": spec.symbol.layout.textSize }
            : {}),
          ...(spec.symbol.layout?.textOffset
            ? { "text-offset": spec.symbol.layout.textOffset }
            : {}),
          ...(spec.symbol.layout?.textAnchor
            ? { "text-anchor": spec.symbol.layout.textAnchor }
            : {}),
        }}
        paint={{
          ...(spec.symbol.paint?.iconOpacity != null
            ? { "icon-opacity": spec.symbol.paint.iconOpacity }
            : {}),
          ...(spec.symbol.paint?.textColor
            ? { "text-color": spec.symbol.paint.textColor }
            : {}),
          ...(spec.symbol.paint?.textHaloColor
            ? { "text-halo-color": spec.symbol.paint.textHaloColor }
            : {}),
          ...(spec.symbol.paint?.textHaloWidth != null
            ? { "text-halo-width": spec.symbol.paint.textHaloWidth }
            : {}),
        }}
      />,
    );
  }
  return layers;
}

/** GeoJSON fill (+ optional line) for MapLibre — no Leaflet CSS zoom compensation. */
export function MapLibreGeoJsonOverlay({
  id,
  data,
  fill,
  line,
  circle,
  symbol,
  layers,
  beforeId,
}: {
  id: string;
  data: Feature | FeatureCollection | Geometry | null | undefined;
  fill?: MapLibreFillPaint | null;
  line?: MapLibreLinePaint | null;
  circle?: MapLibreCirclePaint | null;
  symbol?: MapLibreSymbolSpec | null;
  /** Multiple fill/line/circle/symbol pairs on one Source (same geometry). */
  layers?: readonly MapLibreGeoJsonLayerSpec[];
  beforeId?: string;
}) {
  const collection = useMemo(
    () => (data ? asFeatureCollection(data) : null),
    [data],
  );

  const resolvedLayers = useMemo((): MapLibreGeoJsonLayerSpec[] => {
    if (layers && layers.length > 0) {
      return [...layers];
    }
    if (fill || line || circle || symbol) {
      return [{ id, fill, line, circle, symbol }];
    }
    return [];
  }, [layers, fill, line, circle, symbol, id]);

  if (
    !collection ||
    collection.features.length === 0 ||
    resolvedLayers.length === 0
  ) {
    return null;
  }

  // react-map-gl Source asserts props.id === prevProps.id (JETLAG-3A). Remount
  // when the MapLibre source id changes so the fiber never mutates id in place.
  const sourceId = `${id}-src`;

  return (
    <Source key={sourceId} id={sourceId} type="geojson" data={collection}>
      {resolvedLayers.flatMap((spec) => paintLayersForSpec(spec, beforeId))}
    </Source>
  );
}
