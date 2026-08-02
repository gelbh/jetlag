import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { polygonGeometryFeature } from "../helpers/polygonGeometryFeature";

export function renderMaskPolygon(
  polygon: Feature<GeoPolygon | MultiPolygon>,
  key: string,
  color: string,
  pulsing: boolean,
  selected: boolean,
  selectionEnabled: boolean,
  onSelect?: () => void,
) {
  void pulsing;
  void selectionEnabled;
  void onSelect;

  const fillOpacity = 0.35;
  const line =
    selected
      ? { color, width: 3, opacity: 1 }
      : null;

  return (
    <MapLibreGeoJsonOverlay
      key={key}
      id={key}
      data={polygonGeometryFeature(polygon.geometry as GeoPolygon)}
      fill={{ fillColor: color, fillOpacity }}
      line={line}
    />
  );
}
