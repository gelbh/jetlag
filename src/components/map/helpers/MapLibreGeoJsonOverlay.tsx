import { Fragment, useMemo, type ReactNode } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
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

export interface MapLibreLinePaint {
  color: string;
  width?: number;
  opacity?: number;
  dashArray?: number[];
}

export interface MapLibreGeoJsonLayerSpec {
  id: string;
  fill?: MapLibreFillPaint | null;
  line?: MapLibreLinePaint | null;
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

function renderPaintLayers(
  spec: MapLibreGeoJsonLayerSpec,
  beforeId?: string,
): ReactNode {
  return (
    <>
      {spec.fill ? (
        <Layer
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
        />
      ) : null}
      {spec.line ? (
        <Layer
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
        />
      ) : null}
    </>
  );
}

/** GeoJSON fill (+ optional line) for MapLibre — no Leaflet CSS zoom compensation. */
export function MapLibreGeoJsonOverlay({
  id,
  data,
  fill,
  line,
  layers,
  beforeId,
}: {
  id: string;
  data: Feature | FeatureCollection | Geometry | null | undefined;
  fill?: MapLibreFillPaint | null;
  line?: MapLibreLinePaint | null;
  /** Multiple fill/line pairs on one Source (same geometry). */
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
    if (fill || line) {
      return [{ id, fill, line }];
    }
    return [];
  }, [layers, fill, line, id]);

  if (
    !collection ||
    collection.features.length === 0 ||
    resolvedLayers.length === 0
  ) {
    return null;
  }

  return (
    <Source id={`${id}-src`} type="geojson" data={collection}>
      {resolvedLayers.map((spec) => (
        <Fragment key={spec.id}>{renderPaintLayers(spec, beforeId)}</Fragment>
      ))}
    </Source>
  );
}
