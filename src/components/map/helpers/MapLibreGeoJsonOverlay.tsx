import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
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

/** GeoJSON fill (+ optional line) for MapLibre — no Leaflet CSS zoom compensation. */
export function MapLibreGeoJsonOverlay({
  id,
  data,
  fill,
  line,
  beforeId,
}: {
  id: string;
  data: Feature | FeatureCollection | Geometry | null | undefined;
  fill?: MapLibreFillPaint | null;
  line?: MapLibreLinePaint | null;
  beforeId?: string;
}) {
  const collection = useMemo(
    () => (data ? asFeatureCollection(data) : null),
    [data],
  );

  if (!collection || collection.features.length === 0) {
    return null;
  }

  return (
    <Source id={`${id}-src`} type="geojson" data={collection}>
      {fill ? (
        <Layer
          id={`${id}-fill`}
          type="fill"
          beforeId={beforeId}
          paint={{
            "fill-color": fill.fillColor,
            "fill-opacity": fill.fillOpacity ?? 0.35,
            ...(fill.fillOutlineColor
              ? { "fill-outline-color": fill.fillOutlineColor }
              : {}),
          }}
        />
      ) : null}
      {line ? (
        <Layer
          id={`${id}-line`}
          type="line"
          beforeId={beforeId}
          paint={{
            "line-color": line.color,
            "line-width": line.width ?? 1,
            "line-opacity": line.opacity ?? 1,
            ...(line.dashArray
              ? { "line-dasharray": line.dashArray }
              : {}),
          }}
          layout={{ "line-join": "round", "line-cap": "round" }}
        />
      ) : null}
    </Source>
  );
}

export function polygonGeometryFeature(
  geometry: Polygon | MultiPolygon,
): Feature<Polygon | MultiPolygon> {
  return { type: "Feature", properties: {}, geometry };
}
