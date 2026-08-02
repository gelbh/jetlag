import { memo } from "react";
import { Popup } from "react-leaflet";
import { CompensatedCircle } from "../helpers/CompensatedCircle";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import type { MapDraftOverlay } from "../../../domain/map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { useMapEngine } from "../chrome/mapEngineContext";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { renderGeoJsonPolygonGroups } from "../helpers/renderHelpers";

interface MapDraftLayerProps {
  overlays: readonly MapDraftOverlay[];
}

/** MapLibre Slice 2: polygons only; marker/circle/polyline land in Slice 3. */
function parseDashArray(dash: string | undefined): number[] | undefined {
  if (!dash) {
    return undefined;
  }
  const parts = dash
    .split(/\s+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parts.length > 0 ? parts : undefined;
}

function MapDraftLayerMapLibre({ overlays }: MapDraftLayerProps) {
  const c = MAP_ANNOTATION_COLORS;

  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.kind) {
          case "polygon":
            return (
              <MapLibreGeoJsonOverlay
                key={overlay.id}
                id={`draft-poly-${overlay.id}`}
                data={overlay.feature}
                fill={{
                  fillColor: overlay.style?.fillColor ?? c.boundary,
                  fillOpacity: overlay.style?.fillOpacity ?? 0.2,
                }}
                line={{
                  color: overlay.style?.color ?? c.boundary,
                  width: overlay.style?.weight ?? 1,
                  opacity: overlay.style?.opacity ?? 1,
                  dashArray: parseDashArray(overlay.style?.dashArray),
                }}
              />
            );
          case "marker":
          case "circle":
          case "polyline":
            return null;
          default: {
            const _exhaustive: never = overlay;
            return _exhaustive;
          }
        }
      })}
    </>
  );
}

function MapDraftLayerLeaflet({ overlays }: MapDraftLayerProps) {
  const c = MAP_ANNOTATION_COLORS;

  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.kind) {
          case "marker":
            return (
              <CompensatedCircleMarker
                key={overlay.id}
                center={overlay.point}
                radius={overlay.style?.markerRadius ?? 8}
                pathOptions={{
                  color: overlay.style?.color ?? c.strokeLight,
                  weight: overlay.style?.weight ?? 2,
                  fillColor: overlay.style?.fillColor ?? c.pin,
                  fillOpacity: overlay.style?.fillOpacity ?? 1,
                  opacity: overlay.style?.opacity,
                  className: overlay.style?.pulsing
                    ? "draft-seeker-pulse"
                    : undefined,
                }}
              >
                {overlay.popup ? <Popup>{overlay.popup}</Popup> : null}
              </CompensatedCircleMarker>
            );
          case "circle":
            return (
              <CompensatedCircle
                key={overlay.id}
                center={overlay.center}
                radius={overlay.radiusMeters}
                pathOptions={{
                  color: overlay.style?.color ?? c.radar,
                  weight: overlay.style?.weight ?? 2,
                  dashArray: overlay.style?.dashArray,
                  fillColor: overlay.style?.fillColor,
                  fillOpacity: overlay.style?.fillOpacity ?? 0.08,
                  opacity: overlay.style?.opacity,
                }}
              />
            );
          case "polygon":
            return renderGeoJsonPolygonGroups({
              id: overlay.id,
              feature: overlay.feature,
              pathOptions: {
                color: overlay.style?.color ?? c.boundary,
                weight: overlay.style?.weight ?? 1,
                dashArray: overlay.style?.dashArray,
                fillColor: overlay.style?.fillColor ?? c.boundary,
                fillOpacity: overlay.style?.fillOpacity ?? 0.2,
              },
            });
          case "polyline":
            return (
              <CompensatedPolyline
                key={overlay.id}
                positions={overlay.positions}
                pathOptions={{
                  color: overlay.style?.color ?? c.thermometerAxis,
                  weight: overlay.style?.weight ?? 4,
                  dashArray: overlay.style?.dashArray,
                  opacity: overlay.style?.opacity,
                }}
              />
            );
          default: {
            const _exhaustive: never = overlay;
            return _exhaustive;
          }
        }
      })}
    </>
  );
}

export const MapDraftLayer = memo(function MapDraftLayer(
  props: MapDraftLayerProps,
) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <MapDraftLayerMapLibre {...props} />;
  }
  return <MapDraftLayerLeaflet {...props} />;
});
